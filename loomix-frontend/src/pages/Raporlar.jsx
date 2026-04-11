import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, Row, Col, Statistic, message, Tag } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, TeamOutlined, WalletOutlined, PrinterOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

// --- PDF ve EXCEL Kütüphaneleri ---
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const Raporlar = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        raporuCek();
    }, []);

    const raporuCek = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('/reports/advanced-payroll', {});
            setData(response.data);
        } catch (error) {
            message.error("Rapor verileri çekilemedi!");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!data || data.liste.length === 0) return message.warning("Dışa aktarılacak veri yok.");

        const excelData = data.liste.map(item => ({
            "Personel Adı": item.adSoyad,
            "Departman": item.departman,
            "Ücret Tipi": item.ucretTipi,
            "Günlük/Aylık Ücret (₺)": item.yevmiye,
            "İçerideki Bakiye (Alacak) (₺)": item.bakiye
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bordro_Raporu");

        XLSX.writeFile(workbook, `Bordro_Raporu_${dayjs().format('DD_MM_YYYY')}.xlsx`);
        message.success("Excel dosyası başarıyla indirildi!");
    };

    const exportToPDF = () => {
        if (!data || data.liste.length === 0) return message.warning("Yazdırılacak veri yok.");

        const turkceYap = (text) => {
            if (!text) return "";
            return String(text)
                .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
                .replace(/Ü/g, 'U').replace(/ü/g, 'u')
                .replace(/Ş/g, 'S').replace(/ş/g, 's')
                .replace(/İ/g, 'I').replace(/ı/g, 'i')
                .replace(/Ö/g, 'O').replace(/ö/g, 'o')
                .replace(/Ç/g, 'C').replace(/ç/g, 'c');
        };

        const doc = new jsPDF('p', 'pt', 'a4');
        const raporTarihi = dayjs().format('DD/MM/YYYY HH:mm');

        doc.setFontSize(18);
        doc.text(turkceYap("Loomix - Atolye Bordro ve Hakedis Raporu"), 40, 40);

        doc.setFontSize(11);
        doc.text(turkceYap(`Rapor Tarihi: ${raporTarihi}`), 40, 60);
        doc.text(turkceYap(`Toplam Personel: ${data.toplamPersonel} Kisi`), 40, 75);
        doc.text(turkceYap(`Toplam Odenecek Tutar: ${data.toplamOdenecek.toLocaleString('tr-TR')} TL`), 40, 90);

        const tableColumn = [
            turkceYap("Personel Adi"),
            turkceYap("Departman"),
            turkceYap("Ucret Tipi"),
            turkceYap("Yevmiye (TL)"),
            turkceYap("Icerideki Bakiye (TL)")
        ];
        const tableRows = [];

        data.liste.forEach(item => {
            const rowData = [
                turkceYap(item.adSoyad),
                turkceYap(item.departman),
                turkceYap(item.ucretTipi),
                item.yevmiye.toLocaleString('tr-TR'),
                item.bakiye.toLocaleString('tr-TR')
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 110,
            theme: 'grid',
            headStyles: { fillColor: [24, 144, 255] },
            styles: { font: 'helvetica', fontSize: 10 }
        });

        doc.save(`Bordro_Raporu_${dayjs().format('DD_MM_YYYY')}.pdf`);
        message.success("PDF raporu başarıyla oluşturuldu!");
    };

    // YENİ: Mobilde kaydırma gerektirmeyen, departman bilgisini isim altına sıkıştıran kompakt yapı
    const columns = [
        {
            title: 'Personel Detayı',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px', color: '#1890ff' }}>{record.adSoyad}</b><br />
                    <Space size={4} style={{ marginTop: 4 }}>
                        <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px', margin: 0 }}>
                            {record.departman}
                        </Tag>
                        <span style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.ucretTipi}</span>
                    </Space>
                </div>
            )
        },
        {
            title: 'Yevmiye',
            dataIndex: 'yevmiye',
            key: 'yevmiye',
            align: 'right',
            render: y => <span style={{ fontSize: '13px', color: '#595959' }}>{y?.toLocaleString('tr-TR')} ₺</span>
        },
        {
            title: 'Borç Bakiye',
            dataIndex: 'bakiye',
            key: 'bakiye',
            align: 'right',
            render: b => <b style={{ color: b > 0 ? '#cf1322' : '#3f8600', fontSize: '14px' }}>{b?.toLocaleString('tr-TR')} ₺</b>
        },
    ];

    return (
        // YENİ: Dış padding daraltıldı
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            {/* YENİ: Mobilde kartlar alt alta geçer (xs=24) */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12}>
                    <Card style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title="Aktif Personel Sayısı"
                            value={data?.toplamPersonel || 0}
                            prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                            suffix="Kişi"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title="Atölyenin Toplam Maaş Borcu"
                            value={data?.toplamOdenecek || 0}
                            precision={2}
                            prefix={<WalletOutlined style={{ color: '#cf1322' }} />}
                            suffix="₺"
                            styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}
            >
                {/* YENİ: Mobilde Başlık ve Butonlar birbirini ezmez, gerekirse alt alta esner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: 20 }}>
                    <Title level={4} style={{ margin: 0 }}>Bordro Dökümü</Title>
                    <Space wrap>
                        <Button type="primary" icon={<PrinterOutlined />} ghost>Yazdır</Button>
                        <Button type="primary" icon={<FilePdfOutlined />} danger onClick={exportToPDF}>PDF</Button>
                        <Button type="primary" icon={<FileExcelOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={exportToExcel}>Excel</Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={data?.liste || []}
                    rowKey={(record) => record.id || record._id || Math.random().toString()} // YENİ: Garantili key
                    loading={loading}
                    pagination={{ pageSize: 20, size: 'small' }} // Mobilde ufak navigasyon
                    size="small"
                    bordered
                    summary={() => (
                        // YENİ: 3 Sütuna göre ayarlanmış, mobilde taşmayan özet satırı
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: '#fafafa' }}>
                                <Table.Summary.Cell index={0} colSpan={2}>
                                    <b style={{ float: 'right', fontSize: '13px' }}>GENEL TOPLAM:</b>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <b style={{ color: '#cf1322', fontSize: '15px' }}>{data?.toplamOdenecek?.toLocaleString('tr-TR')} ₺</b>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 15, textAlign: 'right', fontSize: '11px' }}>
                    * Bu rapor {dayjs().format('DD MMMM YYYY, HH:mm')} itibarıyla güncel bakiyeleri yansıtır.
                </Text>
            </Card>
        </div>
    );
};

export default Raporlar;