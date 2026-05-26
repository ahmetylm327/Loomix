import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Table, Tag, Space, Divider } from 'antd';
import {
    UserOutlined, ShopOutlined, WalletOutlined,
    LineChartOutlined, PieChartOutlined, HistoryOutlined, FallOutlined, RiseOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const formatPara = (val) => val?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00";

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosInstance.get('/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Dashboard yüklenemedi", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" description="Yönetim Paneli Hazırlanıyor..." /></div>;

    // --- GRAFİK AYARLARI ---
    const maasConfig = {
        data: stats?.maasAnalizi || [],
        xField: 'hafta',
        yField: 'tutar',
        point: { size: 5 },
        color: '#cf1322', // Gider olduğu için kırmızı tonu
        smooth: true,
    };

    const pieConfig = {
        data: stats?.kategoriDagilimi || [],
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        label: { text: (datum) => `${datum.type}: ${datum.value}`, style: { fontSize: 13, fontWeight: 'bold' } },
    };

    const islemSutunlar = [
        { title: 'Tarih', dataIndex: 'odemeTarihi', width: 100, render: t => dayjs(t).format('DD.MM.YYYY') },
        { title: 'İşlem Türü', dataIndex: 'islemYonu', width: 120, render: y => <Tag color={y === 'Gelir' ? 'success' : 'error'} icon={y === 'Gelir' ? <RiseOutlined /> : <FallOutlined />}>{y === 'Gelir' ? 'Tahsilat' : 'Ödeme'}</Tag> },
        { title: 'Açıklama', dataIndex: 'notlar', render: n => <Text type="secondary">{n || 'Kasa İşlemi'}</Text> },
        {
            title: 'Tutar',
            dataIndex: 'tutar',
            align: 'right',
            render: (t, r) => (
                <b style={{ color: r.islemYonu === 'Gelir' ? '#52c41a' : '#f5222d', fontSize: '15px' }}>
                    {r.islemYonu === 'Gelir' ? '+' : '-'}{formatPara(t)} ₺
                </b>
            )
        }
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{ marginBottom: 25 }}>
                <Title level={3} style={{ margin: 0 }}>Loomix ERP Komuta Merkezi</Title>
                <Text type="secondary">Atölyenizin güncel finansal ve operasyonel durumu.</Text>
            </div>

            {/* ÜST İSTATİSTİK KARTLARI */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderLeft: '5px solid #1890ff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Personel" value={stats?.personelSayisi || 0} prefix={<UserOutlined style={{ color: '#1890ff' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderLeft: '5px solid #52c41a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Müşteriler" value={stats?.cariSayisi || 0} prefix={<ShopOutlined style={{ color: '#52c41a' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderLeft: '5px solid #faad14', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Sistemdeki Modeller" value={stats?.urunSayisi || 0} prefix={<PieChartOutlined style={{ color: '#faad14' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderLeft: '5px solid #f5222d', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ color: '#cf1322', fontWeight: 'bold' }}>Net Kasa Durumu</span>}
                            value={formatPara(stats?.netKasa || 0)}
                            suffix="₺"
                            prefix={<WalletOutlined style={{ color: '#cf1322' }} />}
                            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Divider />

            {/* GRAFİKLER */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title={<Space><LineChartOutlined /> Haftalık Personel Maaş Giderleri</Space>} bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 300 }}><Line {...maasConfig} /></div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={<Space><PieChartOutlined /> Ürün Dağılımı</Space>} bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 300 }}><Pie {...pieConfig} /></div>
                    </Card>
                </Col>
            </Row>

            {/* FİNANSAL İŞLEMLER TABLOSU */}
            <Row style={{ marginTop: 20 }}>
                <Col span={24}>
                    <Card title={<Space><HistoryOutlined /> Son Finansal İşlemler</Space>} bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Table
                            dataSource={stats?.sonIslemler || []}
                            columns={islemSutunlar}
                            rowKey={(r) => r._id || Math.random()}
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;