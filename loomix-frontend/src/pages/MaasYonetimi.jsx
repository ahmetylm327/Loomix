import React, { useEffect, useState } from 'react';
import { Card, Table, message, Button, Typography, Input, InputNumber, Space, Tabs, Modal, Spin } from 'antd';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Text } = Typography;
const { TabPane } = Tabs;

const MaasYonetimi = () => {
    const [veriler, setVeriler] = useState([]);
    const [arsiv, setArsiv] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paketIsmi, setPaketIsmi] = useState(`Haftalık Maaş - ${dayjs().format('DD/MM/YYYY')}`);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [seciliPaketDetaylari, setSeciliPaketDetaylari] = useState([]);
    const [seciliPaketAdi, setSeciliPaketAdi] = useState("");

    useEffect(() => { fetchAnaliz(); fetchArsiv(); }, []);

    const fetchAnaliz = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/mesai/haftalik-analiz');
            const processed = Object.values(res.data.reduce((acc, h) => {
                if (!h.personelId) return acc;
                const pId = h.personelId._id;
                if (!acc[pId]) acc[pId] = { pId, isim: h.personelId.adSoyad, buHafta: 0 };
                if (!dayjs(h.islemTarihi).isBefore(dayjs().subtract(7, 'day'))) {
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

    const exportToExcel = () => {
        const data = veriler.map(v => ({ "Personel": v.isim, "Hakediş (₺)": v.duzenlenenTutar }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Maaslar");
        // Türkçe karakter sorunu için dosya çıktısı
        XLSX.writeFile(wb, `${paketIsmi}.xlsx`, { bookType: 'xlsx', type: 'binary' });
    };

    const topluOdemeYap = async () => {
        if (arsiv.some(a => a._id === paketIsmi)) {
            message.error("Bu haftayı zaten ödediniz!");
            return;
        }

        Modal.confirm({
            title: 'Ödemeleri Onayla',
            content: `"${paketIsmi}" paketini onaylıyor musun?`,
            onOk: async () => {
                try {
                    // Backend'e hem orijinal hem de senin düzenlediğin tutarı gönderiyoruz
                    const list = veriler.map(v => ({
                        pId: v.pId,
                        buHafta: v.buHafta, // Sistem hesaplaması (Puantajdan gelen)
                        duzenlenenTutar: v.duzenlenenTutar // Senin manuel müdahalen
                    }));

                    await axiosInstance.post('/mesai/toplu-odeme', { list, paketIsmi });
                    message.success("Ödemeler ve manuel hakedişler arşivlendi!");
                    fetchAnaliz(); fetchArsiv();
                } catch (e) { message.error("Ödeme kaydedilemedi."); }
            }
        });
    };

    const detayGoster = async (paketAdi) => {
        setSeciliPaketAdi(paketAdi);
        setModalLoading(true);
        setIsModalVisible(true);
        try {
            const res = await axiosInstance.get(`/mesai/arsiv/${encodeURIComponent(paketAdi)}`);
            setSeciliPaketDetaylari(res.data);
        } catch (e) { message.error("Detaylar alınamadı."); setIsModalVisible(false); }
        finally { setModalLoading(false); }
    };

    const arsivSil = async (paketAdi) => {
        Modal.confirm({
            title: 'Bu arşivi silmek istediğine emin misin?',
            onOk: async () => {
                try {
                    await axiosInstance.delete(`/mesai/arsiv/${encodeURIComponent(paketAdi)}`);
                    message.success("Arşiv silindi.");
                    fetchArsiv();
                } catch (e) { message.error("Silme başarısız."); }
            }
        });
    };

    const toplamTalep = veriler.reduce((acc, curr) => acc + curr.duzenlenenTutar, 0);

    return (
        <Card style={{ margin: 20 }}>
            <Tabs defaultActiveKey="1">
                <TabPane tab="Bu Haftalık Hakediş" key="1">
                    <Card title="Yeni Ödeme Paketi Hazırla" extra={
                        <Space>
                            <Button onClick={exportToExcel}>Excel İndir</Button>
                            <Input value={paketIsmi} onChange={e => setPaketIsmi(e.target.value)} style={{ width: 250 }} />
                            <Button type="primary" onClick={topluOdemeYap} disabled={veriler.length === 0}>Öde ve Arşivle</Button>
                        </Space>
                    }>
                        <Table dataSource={veriler} rowKey="pId" pagination={false} columns={[
                            { title: 'Personel', dataIndex: 'isim' },
                            {
                                title: 'Bu Hafta Hakediş', dataIndex: 'duzenlenenTutar', render: (val, r) => (
                                    <InputNumber value={val} onChange={(v) => setVeriler(prev => prev.map(i => i.pId === r.pId ? { ...i, duzenlenenTutar: v } : i))} />
                                )
                            }
                        ]} summary={() => (
                            <Table.Summary.Row><Table.Summary.Cell align="right"><Text strong>TOPLAM:</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong type="success">{toplamTalep.toLocaleString()} ₺</Text></Table.Summary.Cell></Table.Summary.Row>
                        )} />
                    </Card>
                </TabPane>
                <TabPane tab="Geçmiş Ödeme Arşivi" key="2">
                    <Table dataSource={arsiv} rowKey="_id" columns={[
                        { title: 'Paket Adı', dataIndex: '_id' },
                        {
                            title: 'İşlemler', render: (text, r) => (
                                <Space>
                                    <Button size="small" onClick={() => detayGoster(r._id)}>Düzenle/Detaylar</Button>
                                    <Button size="small" danger onClick={() => arsivSil(r._id)}>Sil</Button>
                                </Space>
                            )
                        }
                    ]} />
                </TabPane>
            </Tabs>

            <Modal title="Ödemeleri Düzenle" open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={async () => {
                await axiosInstance.put('/mesai/arsiv', {
                    eskiPaketAdi: seciliPaketAdi,
                    yeniListe: seciliPaketDetaylari.map(d => ({ pId: d.personelId._id, buHafta: Math.abs(d.tutar) })),
                    yeniPaketAdi: seciliPaketAdi
                });
                message.success("Güncellendi!");
                setIsModalVisible(false);
                fetchArsiv();
            }} width={600}>
                {modalLoading ? <Spin /> : (
                    <Table dataSource={seciliPaketDetaylari} rowKey="_id" columns={[
                        { title: 'Personel', dataIndex: ['personelId', 'adSoyad'] },
                        {
                            title: 'Tutar', render: (v, r) => (
                                <InputNumber defaultValue={Math.abs(r.tutar)} onChange={(val) => {
                                    setSeciliPaketDetaylari(prev => prev.map(i => i._id === r._id ? { ...i, tutar: -val } : i));
                                }} />
                            )
                        }
                    ]} pagination={false} />
                )}
            </Modal>
        </Card>
    );
};

export default MaasYonetimi;