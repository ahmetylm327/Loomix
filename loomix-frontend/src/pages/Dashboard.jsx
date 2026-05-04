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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosInstance.get('/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Dashboard yüklenemedi");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" description="Yönetim Paneli Hazırlanıyor..." /></div>;

    // --- GRAFİKLER ---
    const lineConfig = {
        data: stats?.haftalikUretim || [{ tarih: 'Pzt', adet: 120 }, { tarih: 'Sal', adet: 200 }, { tarih: 'Çar', adet: 150 }, { tarih: 'Per', adet: 300 }],
        xField: 'tarih',
        yField: 'adet',
        point: { size: 5, shape: 'diamond' },
        color: '#1890ff',
        smooth: true,
        padding: 'auto',
    };

    const pieConfig = {
        appendPadding: 10,
        data: stats?.kategoriDagilimi || [{ type: 'Aktif', value: 40 }, { type: 'Pasif', value: 10 }],
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        label: { text: (datum) => `${datum.type}: ${datum.value}`, style: { fontSize: 13, fontWeight: 'bold' } },
        interactions: [{ type: 'element-active' }],
    };

    const islemSutunlar = [
        { title: 'Tarih', dataIndex: 'odemeTarihi', width: 100, render: t => dayjs(t).format('DD.MM.YYYY') },
        { title: 'İşlem Türü', dataIndex: 'islemYonu', width: 120, render: y => <Tag color={y === 'Gelir' ? 'success' : 'error'} icon={y === 'Gelir' ? <RiseOutlined /> : <FallOutlined />}>{y === 'Gelir' ? 'Tahsilat' : 'Ödeme'}</Tag> },
        { title: 'Açıklama', dataIndex: 'notlar', render: n => <Text type="secondary">{n || 'Kasa İşlemi'}</Text> },
        { title: 'Tutar', dataIndex: 'tutar', align: 'right', render: (t, r) => <b style={{ color: r.islemYonu === 'Gelir' ? '#52c41a' : '#f5222d', fontSize: '15px' }}>{r.islemYonu === 'Gelir' ? '+' : '-'}{t?.toLocaleString('tr-TR')} ₺</b> }
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>

            <div style={{ marginBottom: 25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <Title level={3} style={{ margin: 0, color: '#1f1f1f' }}>Loomix ERP Komuta Merkezi</Title>
                    <Text type="secondary">Atölyenizin güncel finansal ve operasyonel durumu.</Text>
                </div>
            </div>

            {/* 🚀 1. SATIR: EN KRİTİK FİNANSAL VERİLER (KOKPİT) */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #1890ff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Personel" value={stats?.personelSayisi || 0} prefix={<UserOutlined style={{ color: '#1890ff' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #52c41a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Müşteriler (Cari)" value={stats?.cariSayisi || 0} prefix={<ShopOutlined style={{ color: '#52c41a' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #faad14', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Sistemdeki Modeller" value={stats?.urunSayisi || 0} prefix={<PieChartOutlined style={{ color: '#faad14' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #f5222d', background: '#fff1f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ color: '#cf1322', fontWeight: 'bold' }}>Net Kasa Durumu</span>}
                            value={stats?.netKasa || 0}
                            precision={2}
                            suffix="₺"
                            prefix={<WalletOutlined style={{ color: '#cf1322' }} />}
                            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Divider style={{ margin: '24px 0', borderColor: '#d9d9d9' }} />

            {/* 🚀 2. SATIR: GRAFİKLER VE SAHA OPERASYONLARI */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title={<Space><LineChartOutlined /> Haftalık Üretim / Operasyon Grafiği</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 300 }}><Line {...lineConfig} /></div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={<Space><PieChartOutlined /> Model / Ürün Dağılımı</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 300 }}><Pie {...pieConfig} /></div>
                    </Card>
                </Col>
            </Row>

            {/* 🚀 3. SATIR: SON İŞLEMLER (LOGLAR) */}
            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                <Col span={24}>
                    <Card title={<Space><HistoryOutlined /> Son Yapılan Finansal İşlemler</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Table
                            dataSource={stats?.sonIslemler || []}
                            columns={islemSutunlar}
                            rowKey={(record) => record._id || Math.random()}
                            pagination={{ pageSize: 5 }}
                            size="middle"
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;