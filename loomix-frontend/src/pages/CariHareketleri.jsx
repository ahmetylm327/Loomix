import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Typography, Row, Col, Statistic, Tag, Space, Button } from 'antd';
import { FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const CariHareketleri = () => {
    const [cariler, setCariler] = useState([]);
    const [selectedCari, setSelectedCari] = useState(null);
    const [hareketler, setHareketler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ozet, setOzet] = useState({ borc: 0, alacak: 0, bakiye: 0 });

    useEffect(() => {
        fetchCariler();
    }, []);

    const fetchCariler = async () => {
        try {
            const res = await axiosInstance.get('/caris');
            setCariler(res.data);
        } catch (error) {
            console.error("Cariler yüklenemedi");
        }
    };

    const fetchHareketler = async (cariId) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/caris/${cariId}/ekstre`);
            const data = res.data;

            setHareketler(data.liste || []);
            setOzet({
                borc: data.toplamBorc || 0,
                alacak: data.toplamAlacak || 0,
                bakiye: data.bakiye || 0
            });
        } catch (error) {
            console.error("Hareketler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    // YENİ: Mobilde taşmayan, kompakt 3 sütunlu dekont stili
    const columns = [
        {
            title: 'İşlem Detayı',
            key: 'detay',
            render: (_, record) => (
                <div>
                    <b style={{ color: '#1890ff', fontSize: '13px' }}>
                        {dayjs(record.tarih).format('DD.MM.YYYY')}
                    </b>
                    <br />
                    <Tag
                        color={record.islemCinsi?.includes('Üretim') ? 'blue' : 'orange'}
                        style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px', marginTop: 4 }}
                    >
                        {record.islemCinsi}
                    </Tag>
                    {record.aciklama && (
                        <div style={{ fontSize: '11px', color: '#595959', fontStyle: 'italic', marginTop: 4 }}>
                            {record.aciklama}
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Tutar',
            key: 'tutar',
            align: 'right',
            render: (_, record) => {
                const borc = record.borc || 0;
                const alacak = record.alacak || 0;

                if (borc > 0) {
                    return (
                        <div>
                            <Text type="danger" style={{ fontWeight: 'bold', fontSize: '14px' }}>+{borc.toLocaleString()} ₺</Text>
                            <div style={{ fontSize: '10px', color: '#cf1322' }}>Borç (Alınan İş)</div>
                        </div>
                    );
                } else if (alacak > 0) {
                    return (
                        <div>
                            <Text type="success" style={{ fontWeight: 'bold', fontSize: '14px' }}>-{alacak.toLocaleString()} ₺</Text>
                            <div style={{ fontSize: '10px', color: '#3f8600' }}>Alacak (Ödeme)</div>
                        </div>
                    );
                } else {
                    return '-';
                }
            }
        },
        {
            title: 'Yürüyen Bakiye',
            dataIndex: 'yuruyenBakiye',
            key: 'yuruyenBakiye',
            align: 'right',
            render: (v) => (
                <div style={{ background: '#fafafa', padding: '4px', borderRadius: '4px', border: '1px solid #e8e8e8' }}>
                    <b style={{ color: v > 0 ? '#cf1322' : '#3f8600', fontSize: '14px' }}>
                        {Math.abs(v).toLocaleString()} ₺
                    </b>
                    <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
                        {v > 0 ? 'Müşteri Borçlu' : 'Müşteri Alacaklı'}
                    </div>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>

            {/* Üst Seçim Kartı */}
            <Card variant="borderless" style={{ marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                {/* YENİ: Mobilde başlık ve arama kutusu alt alta geçer */}
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={12}>
                        <Title level={4} style={{ margin: 0, color: '#1890ff' }}><FileTextOutlined /> Cari Hareket Föyü</Title>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Firmanın tüm işlem geçmişi ve ekstresi</Text>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Select
                                showSearch
                                placeholder="Cari Hesap Seçiniz"
                                style={{ width: 250 }}
                                onChange={(val) => {
                                    setSelectedCari(val);
                                    fetchHareketler(val);
                                }}
                                optionFilterProp="children"
                            >
                                {cariler.map(c => <Option key={c._id} value={c._id}>{c.firmaAdi}</Option>)}
                            </Select>
                            <Button icon={<PrinterOutlined />} disabled={!selectedCari}>Yazdır</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {selectedCari && (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                    {/* Özet Kartları: Mobilde alt alta sıralanır */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={8}>
                            <Card variant="borderless" style={{ borderLeft: '4px solid #cf1322', borderRadius: '8px' }}>
                                <Statistic title="Toplam Borç (Alınan İş)" value={ozet.borc} precision={2} suffix="₺" styles={{ content: { fontSize: '18px' } }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card variant="borderless" style={{ borderLeft: '4px solid #3f8600', borderRadius: '8px' }}>
                                <Statistic title="Toplam Alacak (Ödeme)" value={ozet.alacak} precision={2} suffix="₺" styles={{ content: { fontSize: '18px' } }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card variant="borderless" style={{ background: ozet.bakiye > 0 ? '#fff1f0' : '#f6ffed', border: `1px solid ${ozet.bakiye > 0 ? '#ffa39e' : '#b7eb8f'}`, borderRadius: '8px' }}>
                                <Statistic
                                    title="Net Bakiye Durumu"
                                    value={Math.abs(ozet.bakiye)}
                                    precision={2}
                                    suffix="₺"
                                    styles={{ content: { color: ozet.bakiye > 0 ? '#cf1322' : '#3f8600', fontSize: '20px', fontWeight: 'bold' } }}
                                />
                                <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                                    {ozet.bakiye > 0 ? "Firma Bize Borçlu" : "Firmaya Borcumuz Var"}
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Hareket Tablosu */}
                    <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Table
                            dataSource={hareketler}
                            columns={columns}
                            rowKey={(record, index) => record._id || record.id || index}
                            loading={loading}
                            pagination={false}
                            size="small"
                            bordered
                        />
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CariHareketleri;