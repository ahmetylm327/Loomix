import React, { useEffect, useState } from 'react';
import { Card, Table, message, Tag, Button } from 'antd';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

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

    // Veriyi işleyip kıyaslama tablosuna hazırla
    const analizTablosu = () => {
        const simdi = dayjs();
        const personelMap = {};

        veriler.forEach(h => {
            const pId = h.personelId._id;
            if (!personelMap[pId]) personelMap[pId] = { isim: h.personelId.adSoyad, gecenHafta: 0, buHafta: 0 };

            // Tarih kontrolü
            if (dayjs(h.islemTarihi).isBefore(simdi.subtract(7, 'day'))) {
                personelMap[pId].gecenHafta += h.tutar;
            } else {
                personelMap[pId].buHafta += h.tutar;
            }
        });
        return Object.values(personelMap);
    };

    const columns = [
        { title: 'Personel', dataIndex: 'isim', key: 'isim' },
        { title: 'Geçen Hafta Ödenen', dataIndex: 'gecenHafta', render: v => `${v.toLocaleString()} ₺` },
        { title: 'Bu Hafta Hakedilen', dataIndex: 'buHafta', render: v => `${v.toLocaleString()} ₺` },
        {
            title: 'Fark (Talep Edilecek)', key: 'fark', render: r => {
                const fark = r.buHafta - r.gecenHafta;
                return <Tag color={fark > 0 ? 'green' : 'red'}>{fark.toLocaleString()} ₺</Tag>
            }
        }
    ];

    const topluOdemeYap = async () => {
        try {
            const analiz = analizTablosu();
            // Backend'de bir rota oluşturup tüm personellere 'Ödeme' kaydı atacağız
            await axiosInstance.post('/mesai/toplu-odeme', { list: analiz });
            message.success("Tüm ödemeler kaydedildi ve bakiyeler güncellendi.");
            fetchAnaliz(); // Listeyi yenile
        } catch (e) {
            message.error("Ödeme kaydedilemedi.");
        }
    };

    return (
        <Card title="Cuma Günü Maaş Analizi" style={{ margin: 20 }} extra={
            <Button type="primary" onClick={topluOdemeYap}>Bu Haftayı Öde ve Kaydet</Button>
        }>
            <Table dataSource={analizTablosu()} columns={columns} loading={loading} rowKey="isim" />
        </Card>
    );
};

export default MaasYonetimi;