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

    // 🚀 DİNAMİK BAŞLIK: Ekranda kafa karışıklığını önlemek için sadece görsel olarak başlıkları değiştiriyoruz.
    const isTedarikci = seciliCari?.kategori === 'Tedarikçi' || seciliCari?.kategori === 'Toptancı';
    const borcBaslik = isTedarikci ? 'Yaptığımız Ödeme (Gider)' : 'Kestiğimiz Fiş/Borç';
    const alacakBaslik = isTedarikci ? 'Aldığımız Malzeme/Alacak' : 'Aldığımız Tahsilat';

    const exportEkstreExcel = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const excelData = ekstreData.map(item => ({
            "Tarih": dayjs(item.tarih).format('DD.MM.YYYY'),
            "İşlem Cinsi": item.islemCinsi,
            "Açıklama": item.aciklama || '-',
            [borcBaslik]: Math.abs(Number(item.borc || 0)),
            [alacakBaslik]: Math.abs(Number(item.alacak || 0)),
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

        const tableColumn = ["Tarih", "Islem Cinsi", "Aciklama", borcBaslik, alacakBaslik, "Bakiye"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.tarih).format('DD.MM.YYYY'),
            item.islemCinsi,
            item.aciklama || '-',
            Math.abs(Number(item.borc || 0)).toLocaleString('tr-TR'),
            Math.abs(Number(item.alacak || 0)).toLocaleString('tr-TR'),
            Math.abs(Number(item.yuruyenBakiye || 0)).toLocaleString('tr-TR')
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
        { title: 'İşlem Cinsi', dataIndex: 'islemCinsi', width: 130, render: val => <b>{val}</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
        // 🚀 DÜZELTME: Tire (-) hatasını çözen yer. Artık backend'den negatif/pozitif ne gelirse gelsin ekrana basıyor.
        {
            title: borcBaslik,
            dataIndex: 'borc',
            align: 'right',
            width: 140,
            render: val => {
                const miktar = Math.abs(Number(val || 0));
                return miktar > 0 ? <Text type={isTedarikci ? "success" : "danger"}>{miktar.toLocaleString('tr-TR')} ₺</Text> : '-';
            }
        },
        {
            title: alacakBaslik,
            dataIndex: 'alacak',
            align: 'right',
            width: 140,
            render: val => {
                const miktar = Math.abs(Number(val || 0));
                return miktar > 0 ? <Text type={isTedarikci ? "danger" : "success"}>{miktar.toLocaleString('tr-TR')} ₺</Text> : '-';
            }
        },
        {
            title: 'Bakiye',
            dataIndex: 'yuruyenBakiye',
            align: 'right',
            width: 140,
            render: val => {
                const bakiye = Number(val || 0);
                return (
                    <div style={{ lineHeight: '1.2' }}>
                        <b style={{ color: bakiye > 0 ? '#cf1322' : (bakiye < 0 ? '#52c41a' : '#000') }}>
                            {bakiye === 0 ? '0 ₺' : `${Math.abs(bakiye).toLocaleString('tr-TR')} ₺`}
                        </b>
                        <br />
                        <span style={{ fontSize: '10px', color: '#8c8c8c' }}>
                            {bakiye > 0 ? '(Bize Borçlu)' : (bakiye < 0 ? '(Bizden Alacaklı)' : '')}
                        </span>
                    </div>
                )
            }
        }
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

                            <Table.Summary.Cell index={1} align="right">
                                <Text type={isTedarikci ? "success" : "danger"}>
                                    {Math.abs(Number(ekstreOzet.toplamBorc || 0)).toLocaleString('tr-TR')} ₺
                                </Text>
                            </Table.Summary.Cell>

                            <Table.Summary.Cell index={2} align="right">
                                <Text type={isTedarikci ? "danger" : "success"}>
                                    {Math.abs(Number(ekstreOzet.toplamAlacak || 0)).toLocaleString('tr-TR')} ₺
                                </Text>
                            </Table.Summary.Cell>

                            <Table.Summary.Cell index={3} align="right">
                                <div style={{ lineHeight: '1.2' }}>
                                    <span style={{ color: ekstreOzet.bakiye > 0 ? '#cf1322' : (ekstreOzet.bakiye < 0 ? '#52c41a' : '#000') }}>
                                        {Math.abs(Number(ekstreOzet.bakiye || 0)).toLocaleString('tr-TR')} ₺
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '10px', color: '#8c8c8c' }}>
                                        {ekstreOzet.bakiye > 0 ? '(Bize Borçlu)' : (ekstreOzet.bakiye < 0 ? '(Bizden Alacaklı)' : '')}
                                    </span>
                                </div>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />
            </Modal>
        </div>
    );
};

export default CariHareketleri;