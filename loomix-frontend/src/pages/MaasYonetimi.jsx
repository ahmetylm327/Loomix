import React, { useEffect, useState } from 'react';
import { Card, Table, message, Tag, Button, Typography, Input, InputNumber, Space } from 'antd';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Text } = Typography;

const MaasYonetimi = () => {
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paketIsmi, setPaketIsmi] = useState(`Haftalık Maaş - ${dayjs().format('DD/MM/YYYY')}`);

    useEffect(() => {
        fetchAnaliz();
    }, []);

    const fetchAnaliz = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/mesai/haftalik-analiz');
            // Verileri işle ve manuel düzenleme için 'duzenlenenTutar' ekle
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
        } catch (e) { message.error("Analiz verisi yüklenemedi."); }
        finally { setLoading(false); }
    };

    const handleTutarDegis = (pId, yeniDeger) => {
        setVeriler(prev => prev.map(item =>
            item.pId === pId ? { ...item, duzenlenenTutar: yeniDeger } : item
        ));
    };

    const topluOdemeYap = async () => {
        try {
            // Sadece düzenlenmiş tutarları gönderiyoruz
            const list = veriler.map(v => ({ pId: v.pId, buHafta: v.duzenlenenTutar }));
            await axiosInstance.post('/mesai/toplu-odeme', { list, paketIsmi });
            message.success("Ödeme paketi başarıyla arşivlendi!");
            fetchAnaliz();
        } catch (e) { message.error("Ödeme kaydedilemedi."); }
    };

    const toplamTalep = veriler.reduce((acc, curr) => acc + (curr.duzenlenenTutar - curr.gecenHafta), 0);

    const columns = [
        { title: 'Personel', dataIndex: 'isim', key: 'isim' },
        { title: 'Geçen Hafta', dataIndex: 'gecenHafta', render: v => `${v.toLocaleString()} ₺` },
        {
            title: 'Bu Hafta (Manuel Düzenle)', dataIndex: 'duzenlenenTutar', render: (val, record) => (
                <InputNumber
                    value={val}
                    onChange={(v) => handleTutarDegis(record.pId, v)}
                    min={0}
                />
            )
        },
        {
            title: 'Fark (Talep)', key: 'fark', render: r => {
                const fark = r.duzenlenenTutar - r.gecenHafta;
                return <Tag color={fark >= 0 ? 'green' : 'red'}>{fark.toLocaleString()} ₺</Tag>
            }
        }
    ];

    return (
        <Card title="Haftalık Maaş Yönetimi" style={{ margin: 20 }} extra={
            <Space>
                <Input value={paketIsmi} onChange={e => setPaketIsmi(e.target.value)} style={{ width: 250 }} />
                <Button type="primary" onClick={topluOdemeYap} disabled={veriler.length === 0}>
                    Bu Haftayı Öde ve Arşivle
                </Button>
            </Space>
        }>
            <Table
                dataSource={veriler}
                columns={columns}
                loading={loading}
                rowKey="pId"
                pagination={false}
                summary={() => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell colSpan={3} align="right"><Text strong>Müşteriden İstenmesi Gereken Toplam Fark:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell><Text strong type="success" style={{ fontSize: '16px' }}>{toplamTalep.toLocaleString()} ₺</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </Card>
    );
};

export default MaasYonetimi;