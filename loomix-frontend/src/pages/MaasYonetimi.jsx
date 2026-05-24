import React, { useEffect, useState } from 'react';
import { Card, Table, message, Tag, Button, Typography } from 'antd';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Text } = Typography;

const MaasYonetimi = () => {
    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnaliz();
    }, []);

    const fetchAnaliz = async () => {
        try {
            const res = await axiosInstance.get('/mesai/haftalik-analiz');
            setVeriler(res.data);
        } catch (e) { message.error("Analiz verisi yüklenemedi."); }
        finally { setLoading(false); }
    };

    const analizTablosu = () => {
        const simdi = dayjs();
        const personelMap = {};

        veriler.forEach(h => {
            // Backend'den gelen pId'yi buraya aktarıyoruz
            const pId = h.personelId._id;
            if (!personelMap[pId]) {
                personelMap[pId] = { pId, isim: h.personelId.adSoyad, gecenHafta: 0, buHafta: 0 };
            }

            if (dayjs(h.islemTarihi).isBefore(simdi.subtract(7, 'day'))) {
                personelMap[pId].gecenHafta += h.tutar;
            } else {
                personelMap[pId].buHafta += h.tutar;
            }
        });
        return Object.values(personelMap);
    };

    const topluOdemeYap = async () => {
        try {
            const list = analizTablosu();
            // Backend'in beklediği yapıya göre gönderiyoruz
            await axiosInstance.post('/mesai/toplu-odeme', { list });
            message.success("Ödemeler kaydedildi!");
            fetchAnaliz();
        } catch (e) { message.error("Ödeme kaydedilemedi."); }
    };

    const data = analizTablosu();
    const toplamTalep = data.reduce((acc, curr) => acc + (curr.buHafta - curr.gecenHafta), 0);

    const columns = [
        { title: 'Personel', dataIndex: 'isim', key: 'isim' },
        { title: 'Geçen Hafta', dataIndex: 'gecenHafta', render: v => `${v.toLocaleString()} ₺` },
        { title: 'Bu Hafta Hakediş', dataIndex: 'buHafta', render: v => `${v.toLocaleString()} ₺` },
        {
            title: 'Fark (Talep)', key: 'fark', render: r => {
                const fark = r.buHafta - r.gecenHafta;
                return <Tag color={fark > 0 ? 'green' : 'red'}>{fark.toLocaleString()} ₺</Tag>
            }
        }
    ];

    return (
        <Card title="Haftalık Maaş Yönetimi" style={{ margin: 20 }} extra={
            <Button type="primary" onClick={topluOdemeYap} disabled={data.length === 0}>
                Bu Haftayı Öde ve Kaydet
            </Button>
        }>
            <Table
                dataSource={data}
                columns={columns}
                loading={loading}
                rowKey="pId"
                summary={() => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell colSpan={3} align="right"><Text strong>Müşteriden İstenmesi Gereken Toplam:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell><Text strong type="success">{toplamTalep.toLocaleString()} ₺</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </Card>
    );
};

export default MaasYonetimi;