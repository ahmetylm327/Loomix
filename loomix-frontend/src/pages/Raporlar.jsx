import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, Row, Col, Statistic, message, Tag, Modal } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, DollarOutlined, TransactionOutlined, WalletOutlined, SearchOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const Raporlar = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState([]);
    const [ekstreLoading, setEkstreLoading] = useState(false);
    const [seciliPersonel, setSeciliPersonel] = useState(null);

    useEffect(() => {
        raporuCek();
    }, []);

    const raporuCek = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('/reports/advanced-payroll', {});
            setData(response.data);
        } catch (error) {
            message.error("Veriler alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const handleDetayGor = async (personel) => {
        setSeciliPersonel(personel);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const res = await axiosInstance.get(`/employees/${personel.id}/ekstre`);
            setEkstreData(res.data);
        } catch (error) {
            message.error("Personel hareketleri alınamadı!");
        } finally {
            setEkstreLoading(false);
        }
    };

    // 🚀 MİKRO MANTIĞI: Gelen veriyi Borç/Alacak olarak ayıran fonksiyonlar
    const isBorc = (islemTipi) => islemTipi === 'Ödeme' || islemTipi === 'Avans';
    const isAlacak = (islemTipi) => islemTipi === 'Hakediş' || islemTipi === 'Avans İadesi';

    // 🚀 YENİ: Tamamen Klasik ERP Formatında Ekstre Sütunları
    const ekstreColumns = [
        {
            title: 'Tarih',
            dataIndex: 'islemTarihi',
            width: 130,
            render: val => dayjs(val).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'Evrak Cinsi',
            dataIndex: 'islemTipi',
            width: 150,
            render: val => <b>{val === 'Hakediş' ? 'Personel Tahakkuku' : (val === 'Ödeme' ? 'Kasa Tediye Fişi' : val)}</b>
        },
        {
            title: 'Açıklama',
            dataIndex: 'aciklama'
        },
        {
            title: 'TL Borç (Ödenen)',
            dataIndex: 'tutar',
            align: 'right',
            width: 120,
            render: (val, record) => isBorc(record.islemTipi) ? <Text type="danger">{Math.abs(val).toLocaleString('tr-TR')} ₺</Text> : '-'
        },
        {
            title: 'TL Alacak (Hakediş)',
            dataIndex: 'tutar',
            align: 'right',
            width: 120,
            render: (val, record) => isAlacak(record.islemTipi) ? <Text type="success">{Math.abs(val).toLocaleString('tr-TR')} ₺</Text> : '-'
        },
        {
            title: 'Bakiye',
            dataIndex: 'bakiyeSonrasi',
            align: 'right',
            width: 120,
            render: val => <b>{Number(val || 0).toLocaleString('tr-TR')} ₺</b>
        },
    ];

    const anaTabloColumns = [
        {
            title: 'Personel',
            dataIndex: 'adSoyad',
            key: 'adSoyad',
            render: (text, record) => (
                <div>
                    <b>{text}</b><br />
                    <small style={{ color: '#8c8c8c' }}>{record.departman}</small>
                </div>
            )
        },
        {
            title: 'Toplam Hakediş (+)',
            dataIndex: 'toplamHakedis',
            align: 'right',
            render: val => <span style={{ color: '#1890ff' }}>{val?.toLocaleString('tr-TR')} ₺</span>
        },
        {
            title: 'Toplam Ödenen (-)',
            dataIndex: 'toplamOdenen',
            align: 'right',
            render: val => <span style={{ color: '#cf1322' }}>{val?.toLocaleString('tr-TR')} ₺</span>
        },
        {
            title: 'Güncel Bakiye',
            dataIndex: 'bakiye',
            align: 'right',
            render: b => (
                <Tag color={b > 0 ? "error" : "success"} style={{ fontWeight: 'bold' }}>
                    {b?.toLocaleString('tr-TR')} ₺
                </Tag>
            )
        },
        {
            title: 'Cari Hesap',
            key: 'aksiyon',
            align: 'center',
            render: (_, record) => (
                <Button type="dashed" icon={<SearchOutlined />} size="small" onClick={() => handleDetayGor(record)}>
                    Ekstre Gör
                </Button>
            )
        }
    ];

    // --- DIŞA AKTARIM (ANA RAPOR) ---
    const exportAnaRaporExcel = () => {
        const excelData = data.liste.map(item => ({
            "Personel": item.adSoyad,
            "Departman": item.departman,
            "Toplam Hakediş": item.toplamHakedis,
            "Toplam Ödenen": item.toplamOdenen,
            "Net Bakiye": item.bakiye
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cari_Ozet");
        XLSX.writeFile(workbook, `Personel_Cari_Ozet_${dayjs().format('DD_MM_YYYY')}.xlsx`);
    };

    // --- DIŞA AKTARIM (EKSTRE MODALI İÇİN) ---
    const exportEkstreExcel = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const excelData = ekstreData.map(item => ({
            "Tarih": dayjs(item.islemTarihi).format('DD.MM.YYYY HH:mm'),
            "Evrak Cinsi": item.islemTipi === 'Hakediş' ? 'Personel Tahakkuku' : (item.islemTipi === 'Ödeme' ? 'Kasa Tediye Fişi' : item.islemTipi),
            "Açıklama": item.aciklama || '-',
            "TL Borç": isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0,
            "TL Alacak": isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0,
            "Bakiye": item.bakiyeSonrasi || 0
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hesap_Ekstresi");
        XLSX.writeFile(workbook, `${seciliPersonel?.adSoyad}_Hesap_Ekstresi.xlsx`);
    };

    const exportEkstrePDF = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const doc = new jsPDF('p', 'pt', 'a4');
        const isim = seciliPersonel?.adSoyad || 'Personel';

        doc.setFontSize(14);
        doc.text(`${isim} - Cari Hesap Ekstresi`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 40, 55);

        const tableColumn = ["Tarih", "Evrak Cinsi", "Aciklama", "Borc (TL)", "Alacak (TL)", "Bakiye"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.islemTarihi).format('DD.MM.YYYY'),
            item.islemTipi === 'Hakediş' ? 'Tahakkuk' : item.islemTipi,
            item.aciklama || '-',
            isBorc(item.islemTipi) ? Math.abs(item.tutar).toLocaleString('tr-TR') : '-',
            isAlacak(item.islemTipi) ? Math.abs(item.tutar).toLocaleString('tr-TR') : '-',
            Number(item.bakiyeSonrasi || 0).toLocaleString('tr-TR')
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            theme: 'grid',
            headStyles: { fillColor: [89, 89, 89] },
            styles: { fontSize: 8 }
        });

        doc.save(`${isim}_Ekstre.pdf`);
    };

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={3} style={{ marginBottom: 20 }}>Finansal Mizan ve Cari Rapor</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #1890ff' }}>
                        <Statistic title="Şirketin Toplam Borçlandığı" value={data?.ozet?.toplamBorc || 0} prefix={<TransactionOutlined />} suffix="₺" />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #cf1322' }}>
                        <Statistic title="Şirketin Toplam Ödediği" value={data?.ozet?.toplamOdenen || 0} prefix={<DollarOutlined />} suffix="₺" valueStyle={{ color: '#cf1322' }} />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #52c41a' }}>
                        <Statistic title="Net Kalan Bakiye (Borç)" value={data?.ozet?.netKalan || 0} prefix={<WalletOutlined />} suffix="₺" valueStyle={{ color: data?.ozet?.netKalan > 0 ? '#cf1322' : '#3f8600' }} />
                    </Card>
                </Col>
            </Row>

            <Card
                title="Personel Cari Dökümü (Özet)"
                extra={
                    <Button type="primary" icon={<FileExcelOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={exportAnaRaporExcel}>
                        Özeti Excel'e Aktar
                    </Button>
                }
            >
                <Table
                    columns={anaTabloColumns}
                    dataSource={data?.liste || []}
                    loading={loading}
                    rowKey="id"
                    bordered
                    size="middle"
                />
            </Card>

            {/* 🚀 MÜŞTERİNİN İSTEDİĞİ KLASİK MİZAN (EKSTRE) EKRANI */}
            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30 }}>
                        <span>{seciliPersonel?.adSoyad || ''} - Detaylı Hesap Ekstresi</span>
                        <Space>
                            <Button size="small" icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} onClick={exportEkstreExcel}>Excel</Button>
                            <Button size="small" type="primary" danger icon={<FilePdfOutlined />} onClick={exportEkstrePDF}>PDF</Button>
                        </Space>
                    </div>
                }
                open={isEkstreVisible}
                onCancel={() => setIsEkstreVisible(false)}
                footer={null}
                width={900}
                destroyOnHidden
            >
                <Table
                    columns={ekstreColumns}
                    dataSource={ekstreData}
                    rowKey="_id"
                    loading={ekstreLoading}
                    pagination={{ pageSize: 12 }}
                    size="small"
                    bordered
                    style={{ marginTop: 15 }}
                />
            </Modal>

        </div>
    );
};

export default Raporlar;