import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, message, Modal, Tag } from 'antd';
import { SearchOutlined, FileExcelOutlined, FilePdfOutlined, TeamOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const CariHareketleri = () => {
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState([]);
    const [ekstreOzet, setEkstreOzet] = useState({});
    const [ekstreLoading, setEkstreLoading] = useState(false);
    const [seciliCari, setSeciliCari] = useState(null);

    useEffect(() => {
        fetchCariler();
    }, []);

    const fetchCariler = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/caris');
            setCariler(response.data);
        } catch (error) {
            message.error("Firma listesi alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const handleDetayGor = async (cari) => {
        setSeciliCari(cari);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const res = await axiosInstance.get(`/caris/${cari._id}/ekstre`);
            setEkstreData(res.data.liste);
            setEkstreOzet({
                toplamBorc: res.data.toplamBorc,
                toplamAlacak: res.data.toplamAlacak,
                bakiye: res.data.bakiye
            });
        } catch (error) {
            message.error("Cari hareketleri alınamadı!");
        } finally {
            setEkstreLoading(false);
        }
    };

    const exportEkstreExcel = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const excelData = ekstreData.map(item => ({
            "Tarih": dayjs(item.tarih).format('DD.MM.YYYY'),
            "İşlem Cinsi": item.islemCinsi,
            "Açıklama": item.aciklama,
            "Borç (Bize Olan)": item.borc,
            "Alacak (Ödenen)": item.alacak,
            "Kalan Bakiye": item.yuruyenBakiye
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Firma_Ekstresi");
        XLSX.writeFile(workbook, `${seciliCari?.firmaAdi}_Cari_Ekstresi.xlsx`);
    };

    const exportEkstrePDF = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const doc = new jsPDF('p', 'pt', 'a4');

        doc.setFontSize(14);
        doc.text(`${seciliCari?.firmaAdi} - Cari Hesap Ekstresi`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 40, 55);

        const tableColumn = ["Tarih", "Islem Cinsi", "Aciklama", "Borc (TL)", "Alacak (TL)", "Bakiye"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.tarih).format('DD.MM.YYYY'),
            item.islemCinsi,
            item.aciklama || '-',
            item.borc.toLocaleString('tr-TR'),
            item.alacak.toLocaleString('tr-TR'),
            item.yuruyenBakiye.toLocaleString('tr-TR')
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 70, theme: 'grid', headStyles: { fillColor: [24, 144, 255] }, styles: { fontSize: 8 } });
        doc.save(`${seciliCari?.firmaAdi}_Ekstre.pdf`);
    };

    const anaTabloColumns = [
        {
            title: 'Firma Bilgisi',
            key: 'firmaAdi',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '15px' }}>{record.firmaAdi}</b><br />
                    <small style={{ color: '#8c8c8c' }}>{record.kategori || 'Genel'}</small>
                </div>
            )
        },
        { title: 'Telefon', dataIndex: 'telefon', render: t => t || '-' },
        {
            title: 'Güncel Bakiye',
            dataIndex: 'bakiye',
            align: 'right',
            render: val => (
                <Tag color={val > 0 ? "error" : (val < 0 ? "success" : "default")} style={{ fontSize: '14px', padding: '4px 8px' }}>
                    {val > 0 ? `Bize Borçlu: ${val.toLocaleString('tr-TR')} ₺` : (val < 0 ? `Bizden Alacaklı: ${Math.abs(val).toLocaleString('tr-TR')} ₺` : 'Bakiye Sıfır')}
                </Tag>
            )
        },
        {
            title: 'Aksiyon',
            key: 'aksiyon',
            align: 'center',
            render: (_, record) => (
                <Button type="primary" icon={<SearchOutlined />} onClick={() => handleDetayGor(record)}>
                    Detaylı Ekstre
                </Button>
            )
        }
    ];

    const ekstreColumns = [
        { title: 'Tarih', dataIndex: 'tarih', width: 110, render: val => dayjs(val).format('DD.MM.YYYY') },
        { title: 'İşlem Cinsi', dataIndex: 'islemCinsi', width: 140, render: val => <b>{val}</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
        { title: 'Borç (TL)', dataIndex: 'borc', align: 'right', width: 110, render: val => val > 0 ? <Text type="danger">{val.toLocaleString('tr-TR')} ₺</Text> : '-' },
        { title: 'Alacak (TL)', dataIndex: 'alacak', align: 'right', width: 110, render: val => val > 0 ? <Text type="success">{val.toLocaleString('tr-TR')} ₺</Text> : '-' },
        { title: 'Bakiye', dataIndex: 'yuruyenBakiye', align: 'right', width: 120, render: val => <b style={{ color: val > 0 ? '#cf1322' : '#000' }}>{val.toLocaleString('tr-TR')} ₺</b> }
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={3} style={{ marginBottom: 20 }}><TeamOutlined /> Müşteri & Tedarikçi Cari Hareketleri</Title>

            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table columns={anaTabloColumns} dataSource={cariler} loading={loading} rowKey="_id" size="middle" />
            </Card>

            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30 }}>
                        <span><b style={{ color: '#1890ff' }}>{seciliCari?.firmaAdi}</b> - Detaylı Hesap Ekstresi</span>
                        <Space>
                            <Button size="small" icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} onClick={exportEkstreExcel}>Excel</Button>
                            <Button size="small" type="primary" danger icon={<FilePdfOutlined />} onClick={exportEkstrePDF}>PDF</Button>
                        </Space>
                    </div>
                }
                open={isEkstreVisible}
                onCancel={() => setIsEkstreVisible(false)}
                footer={null}
                width={950}
                destroyOnHidden
            >
                <Table
                    columns={ekstreColumns}
                    dataSource={ekstreData}
                    rowKey="key"
                    loading={ekstreLoading}
                    pagination={{ pageSize: 12 }}
                    size="small"
                    bordered
                    style={{ marginTop: 15 }}
                    summary={() => (
                        <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold', fontSize: '14px' }}>
                            <Table.Summary.Cell index={0} colSpan={3} align="right">GENEL TOPLAM:</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><Text type="danger">{Number(ekstreOzet.toplamBorc || 0).toLocaleString('tr-TR')} ₺</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Text type="success">{Number(ekstreOzet.toplamAlacak || 0).toLocaleString('tr-TR')} ₺</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                                <span style={{ color: ekstreOzet.bakiye > 0 ? '#cf1322' : '#000' }}>{Number(ekstreOzet.bakiye || 0).toLocaleString('tr-TR')} ₺</span>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />
            </Modal>
        </div>
    );
};

export default CariHareketleri;