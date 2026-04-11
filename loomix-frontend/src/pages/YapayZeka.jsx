import React, { useState } from 'react';
import { Card, Typography, Form, Select, Button, Row, Col, Statistic, message, Divider, Spin, Switch, Tooltip, Space } from 'antd';
import { RobotOutlined, AimOutlined, InfoCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';

const { Title, Text } = Typography;
const { Option } = Select;

const YapayZeka = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [tahminVerisi, setTahminVerisi] = useState(null);

    const handleTahminOlustur = async (values) => {
        setLoading(true);
        try {
            const payload = {
                forecastPeriod: values.forecastPeriod,
                confidenceLevel: 95,
                includeSeasonality: values.includeSeasonality
            };

            const response = await axiosInstance.post('/estimates/ai-forecast', payload);
            setTahminVerisi(response.data);
            message.success("Loomix AI analizi başarıyla tamamladı!");
        } catch (error) {
            if (error.response && error.response.status === 422) {
                message.warning("Analiz için yeterli geçmiş veri bulunamadı!");
            } else {
                message.error("Tahmin motoru çalıştırılırken bir hata oluştu!");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>

            <Card variant="borderless" style={{ marginBottom: 20, background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: '12px' }}>
                <Title level={3} style={{ color: '#531dab', marginBottom: 10 }}>
                    <RobotOutlined style={{ marginRight: '10px' }} /> Loomix AI Tahmin
                </Title>
                <Text style={{ color: '#531dab', display: 'block', marginBottom: 15, fontSize: '13px' }}>
                    Atölyenizin verilerini analiz ederek gelecek projeksiyonu sunar.
                </Text>

                <Divider style={{ borderColor: '#d3adf7', margin: '15px 0' }} />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleTahminOlustur}
                    initialValues={{ forecastPeriod: 'gelecekAy', includeSeasonality: true }}
                    name="ai_forecast_form"
                >
                    <Row gutter={[16, 0]}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="forecastPeriod"
                                label="Tahmin Periyodu"
                                rules={[{ required: true }]}
                            >
                                <Select size="large" style={{ width: '100%' }} placeholder="Seçiniz">
                                    <Option value="gelecekHafta">Gelecek Hafta</Option>
                                    <Option value="gelecekAy">Gelecek Ay</Option>
                                    <Option value="gelecekYıl">Gelecek Yıl</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="includeSeasonality"
                                label="Sezon Analizi"
                                valuePropName="checked"
                            >
                                <div style={{ padding: '8px 0' }}>
                                    <Switch checkedChildren="Açık" unCheckedChildren="Kapalı" />
                                    <Text type="secondary" style={{ marginLeft: 10, fontSize: '12px' }}>Mevsimsellik Etkisi</Text>
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<AimOutlined />}
                            loading={loading}
                            block
                            size="large"
                            style={{ background: '#722ed1', borderColor: '#722ed1', height: '50px', borderRadius: '8px' }}
                        >
                            Analizi Başlat
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" description="Loomix AI verileri işliyor..." />
                </div>
            )}

            {tahminVerisi && !loading && (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12}>
                            <Card variant="borderless" style={{ background: '#e6f7ff', borderLeft: '5px solid #1890ff' }}>
                                {/* YENİ: styles={{ content: ... }} yapısına geçildi */}
                                <Statistic title="Tahmini Üretim" value={tahminVerisi.predictedProductionVolume} prefix={<LineChartOutlined />} styles={{ content: { fontSize: '20px', color: '#096dd9' } }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Card variant="borderless" style={{ background: '#f6ffed', borderLeft: '5px solid #52c41a' }}>
                                <Statistic title="Beklenen Gelir" value={tahminVerisi.estimatedGrossRevenue} precision={2} suffix="₺" styles={{ content: { fontSize: '20px', color: '#3f8600' } }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Card variant="borderless" style={{ background: '#fff2f0', borderLeft: '5px solid #ff4d4f' }}>
                                <Statistic title="Tahmini Gider" value={tahminVerisi.projectedExpenses} precision={2} suffix="₺" styles={{ content: { fontSize: '20px', color: '#cf1322' } }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Card variant="borderless" style={{ background: '#fffbe6', borderLeft: '5px solid #faad14' }}>
                                <Statistic title="Kar Marjı" value={tahminVerisi.aiProfitMargin} styles={{ content: { fontSize: '20px', fontWeight: 'bold', color: '#ad8b00' } }} />
                            </Card>
                        </Col>
                    </Row>

                    <Card
                        title={<Space><InfoCircleOutlined /> Analiz Notları</Space>}
                        variant="borderless"
                        style={{ marginTop: 20, borderTop: '4px solid #722ed1', borderRadius: '8px' }}
                    >
                        <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>MEVSİMSEL TREND</Text>
                        <p style={{ marginTop: 5 }}>{tahminVerisi._ekstraAnalizler?.sezonTrendEtkisi || "Normal seyir bekleniyor."}</p>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default YapayZeka;