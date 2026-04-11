import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Table, Tag, Space } from 'antd';
import {
    UserOutlined, ShopOutlined, BoxPlotOutlined, WalletOutlined,
    LineChartOutlined, PieChartOutlined, HistoryOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title } = Typography;

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

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" description="Veriler Hazırlanıyor..." /></div>;

    // --- GRAFİK VERİLERİ ---
    const lineData = stats?.haftalikUretim || [
        { tarih: 'Pzt', adet: 450 }, { tarih: 'Sal', adet: 520 },
        { tarih: 'Çar', adet: 380 }, { tarih: 'Per', adet: 650 },
        { tarih: 'Cum', adet: 710 }, { tarih: 'Cmt', adet: 480 }
    ];

    const lineConfig = {
        data: lineData,
        xField: 'tarih',
        yField: 'adet',
        point: { size: 5, shape: 'diamond' },
        color: '#1890ff',
        smooth: true,
        // Mobilde grafiğin daha iyi görünmesi için padding ayarı
        padding: 'auto',
    };

    const pieData = stats?.kategoriDagilimi || [
        { type: 'Üst Giyim', value: 40 }, { type: 'Alt Giyim', value: 25 },
        { type: 'Aksesuar', value: 15 }, { type: 'Diğer', value: 20 },
    ];

    const pieConfig = {
        appendPadding: 10,
        data: pieData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        label: {
            text: (datum) => `${datum.type}: ${datum.value}`,
            style: { fontSize: 14, fontWeight: 'bold' }
        },
        interactions: [{ type: 'element-active' }],
    };

    const islemSutunlar = [
        { title: 'Tarih', dataIndex: 'odemeTarihi', render: t => dayjs(t).format('DD.MM.YYYY') },
        { title: 'Açıklama', dataIndex: 'notlar', render: n => n || 'Kasa İşlemi' },
        { title: 'Yön', dataIndex: 'islemYonu', render: y => <Tag color={y === 'Gelir' ? 'green' : 'red'}>{y}</Tag> },
        { title: 'Tutar', dataIndex: 'tutar', align: 'right', render: (t, r) => <b style={{ color: r.islemYonu === 'Gelir' ? '#52c41a' : '#f5222d', fontSize: '15px' }}>{t} ₺</b> }
    ];

    return (
        // YENİ: Mobilde kenar boşluklarını azalttık (padding: 15px) ve yatay taşmayı engelledik (overflowX)
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            {/* YENİ: Başlık boyutunu mobilde çok yer kaplamaması için ayarlıyoruz */}
            <Title level={3} style={{ marginBottom: 20 }}>
                <LineChartOutlined /> Atölye Yönetim Paneli
            </Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderTop: '4px solid #1890ff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Personel" value={stats?.personelSayisi || 0} prefix={<UserOutlined style={{ color: '#1890ff' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderTop: '4px solid #52c41a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Müşteriler" value={stats?.cariSayisi || 0} prefix={<ShopOutlined style={{ color: '#52c41a' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderTop: '4px solid #faad14', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Aktif Modeller" value={stats?.urunSayisi || 0} prefix={<BoxPlotOutlined style={{ color: '#faad14' }} />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card variant="borderless" style={{ borderTop: '4px solid #f5222d', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title="Net Kasa Bakiyesi"
                            value={stats?.netKasa || 0}
                            precision={2}
                            suffix="₺"
                            prefix={<WalletOutlined style={{ color: '#f5222d' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                <Col xs={24} lg={16}>
                    <Card title={<Space><LineChartOutlined /> Haftalık Üretim</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {/* Mobilde grafik yüksekliğini bir miktar kıstık */}
                        <div style={{ height: 280 }}><Line {...lineConfig} /></div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={<Space><PieChartOutlined /> Kategori Dağılımı</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 280 }}><Pie {...pieConfig} /></div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                <Col span={24}>
                    <Card title={<Space><HistoryOutlined /> Son Kasa Hareketleri</Space>} variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {/* YENİ: Mobilde tablo sıkışmasın diye yana kaydırma (scroll) özelliği eklendi */}
                        <Table
                            dataSource={stats?.sonIslemler || []}
                            columns={islemSutunlar}
                            rowKey={(record) => record._id || Math.random()}
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;