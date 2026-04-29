import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, Row, Col, Statistic, message, Tag, Divider } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, DollarOutlined, TransactionOutlined, WalletOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
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
            message.error("Veriler alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
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
    ];

    const exportToExcel = () => {
        const excelData = data.liste.map(item => ({
            "Personel": item.adSoyad,
            "Toplam Hakediş": item.toplamHakedis,
            "Toplam Ödenen": item.toplamOdenen,
            "Net Bakiye": item.bakiye
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cari_Rapor");
        XLSX.writeFile(workbook, `Personel_Mizan_${dayjs().format('DD_MM_YYYY')}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('p', 'pt', 'a4');
        autoTable(doc, {
            head: [['Personel', 'Toplam Hakedis', 'Toplam Odenen', 'Net Bakiye']],
            body: data.liste.map(i => [i.adSoyad, i.toplamHakedis + " TL", i.toplamOdenen + " TL", i.bakiye + " TL"]),
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] }
        });
        doc.save(`Personel_Cari_Rapor.pdf`);
    };

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={3} style={{ marginBottom: 20 }}>Finansal Mizan ve Cari Rapor</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #1890ff' }}>
                        <Statistic
                            title="Şirketin Toplam Borçlandığı"
                            value={data?.ozet?.toplamBorc || 0}
                            prefix={<TransactionOutlined />}
                            suffix="₺"
                        />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #cf1322' }}>
                        <Statistic
                            title="Şirketin Toplam Ödediği"
                            value={data?.ozet?.toplamOdenen || 0}
                            prefix={<DollarOutlined />}
                            suffix="₺"
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card style={{ borderTop: '4px solid #52c41a' }}>
                        <Statistic
                            title="Net Kalan Bakiye (Borç)"
                            value={data?.ozet?.netKalan || 0}
                            prefix={<WalletOutlined />}
                            suffix="₺"
                            valueStyle={{ color: data?.ozet?.netKalan > 0 ? '#cf1322' : '#3f8600' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                title="Personel Cari Dökümü"
                extra={
                    <Space>
                        <Button type="primary" icon={<FilePdfOutlined />} danger onClick={exportToPDF}>PDF</Button>
                        <Button type="primary" icon={<FileExcelOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={exportToExcel}>Excel</Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={data?.liste || []}
                    loading={loading}
                    rowKey="id"
                    bordered
                    size="middle"
                />
            </Card>
        </div>
    );
};

export default Raporlar;