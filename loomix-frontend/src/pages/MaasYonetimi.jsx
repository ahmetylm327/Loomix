import React, { useEffect, useState } from 'react';
import { Card, Table, message, Tag, Button, Typography, Input, InputNumber, Space, Tabs } from 'antd';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TabPane } = Tabs;

const MaasYonetimi = () => {
    const [veriler, setVeriler] = useState([]);
    const [arsiv, setArsiv] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paketIsmi, setPaketIsmi] = useState(`Haftalık Maaş - ${dayjs().format('DD/MM/YYYY')}`);

    useEffect(() => {
        fetchAnaliz();
        fetchArsiv();
    }, []);

    const fetchAnaliz = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/mesai/haftalik-analiz');
            const processed = Object.values(res.data.reduce((acc, h) => {
                const pId = h.personelId._id;
                if (!acc[pId]) acc[pId] = { pId, isim: h.personelId.adSoyad, gecenHafta: 0, buHafta: 0 };
                if (dayjs(h.islemTarihi).isBefore(dayjs().subtract(7, 'day'))) {
                    acc[pId].gecenHafta += h.tutar;
                } else {
                    acc[pId].buHafta += h.tutar;
                }
                return acc;
            }, {})).map(item => ({ ...item, duzenlenenTutar: item.buHafta }));
            setVeriler(processed);
        } catch (e) { message.error("Veri yüklenemedi."); }
        finally { setLoading(false); }
    };

    const fetchArsiv = async () => {
        try {
            const res = await axiosInstance.get('/mesai/gecmis-odemeler');
            setArsiv(res.data);
        } catch (e) { message.error("Arşiv yüklenemedi."); }
    };

    const topluOdemeYap = async () => {
        try {
            const list = veriler.map(v => ({ pId: v.pId, buHafta: v.duzenlenenTutar }));
            await axiosInstance.post('/mesai/toplu-odeme', { list, paketIsmi });
            message.success("Ödeme paketi başarıyla arşivlendi!");
            fetchAnaliz();
            fetchArsiv(); // Arşivi güncelle
        } catch (e) { message.error("Ödeme kaydedilemedi."); }
    };

    const toplamTalep = veriler.reduce((acc, curr) => acc + (curr.duzenlenenTutar - curr.gecenHafta), 0);

    return (
        <Card style={{ margin: 20 }}>
            <Tabs defaultActiveKey="1">
                <TabPane tab="Bu Haftalık Hakediş" key="1">
                    <Card title="Yeni Ödeme Paketi Hazırla" extra={
                        <Space>
                            <Input value={paketIsmi} onChange={e => setPaketIsmi(e.target.value)} style={{ width: 250 }} />
                            <Button type="primary" onClick={topluOdemeYap} disabled={veriler.length === 0}>
                                Bu Haftayı Öde ve Arşivle
                            </Button>
                        </Space>
                    }>
                        <Table dataSource={veriler} rowKey="pId" pagination={false} columns={[
                            { title: 'Personel', dataIndex: 'isim' },
                            { title: 'Geçen Hafta', dataIndex: 'gecenHafta', render: v => `${v.toLocaleString()} ₺` },
                            {
                                title: 'Bu Hafta (Düzenle)', dataIndex: 'duzenlenenTutar', render: (val, r) => (
                                    <InputNumber value={val} onChange={(v) => setVeriler(prev => prev.map(i => i.pId === r.pId ? { ...i, duzenlenenTutar: v } : i))} />
                                )
                            },
                            { title: 'Fark', render: r => <Tag color={r.duzenlenenTutar - r.gecenHafta >= 0 ? 'green' : 'red'}>{(r.duzenlenenTutar - r.gecenHafta).toLocaleString()} ₺</Tag> }
                        ]} summary={() => (
                            <Table.Summary.Row><Table.Summary.Cell colSpan={3} align="right"><Text strong>Toplam Fark:</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong type="success">{toplamTalep.toLocaleString()} ₺</Text></Table.Summary.Cell></Table.Summary.Row>
                        )} />
                    </Card>
                </TabPane>
                <TabPane tab="Geçmiş Ödeme Arşivi" key="2">
                    <Table dataSource={arsiv} rowKey="_id" columns={[
                        { title: 'Paket Adı', dataIndex: '_id' },
                        { title: 'Tarih', dataIndex: 'tarih', render: v => dayjs(v).format('DD/MM/YYYY') },
                        { title: 'Toplam Ödenen', dataIndex: 'toplam', render: v => `${v.toLocaleString()} ₺` }
                    ]} />
                </TabPane>
            </Tabs>
        </Card>
    );
};

export default MaasYonetimi;