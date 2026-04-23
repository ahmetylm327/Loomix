import React, { useState, useEffect } from 'react';
import { Card, Typography, Upload, message, Table, Tag, Row, Col, Statistic, Alert, Button, Modal, Form, TimePicker } from 'antd';
import { InboxOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined, SettingOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const PuantajYukle = () => {
    const [loading, setLoading] = useState(false);
    const [rapor, setRapor] = useState(null);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [settingsForm] = Form.useForm();

    const fetchSettings = async () => {
        try {
            const res = await axiosInstance.get('/attendance/settings'); // Bu rotayı backend'e eklemeliyiz
            const { baslangic, bitis, molaBas, molaBit } = res.data;
            settingsForm.setFieldsValue({
                baslangic: dayjs(baslangic, 'HH:mm'),
                bitis: dayjs(bitis, 'HH:mm'),
                molaBas: dayjs(molaBas, 'HH:mm'),
                molaBit: dayjs(molaBit, 'HH:mm'),
            });
        } catch (e) { console.log("Ayarlar çekilemedi."); }
    };

    const handleSettingsSave = async (values) => {
        const payload = {
            baslangic: values.baslangic.format('HH:mm'),
            bitis: values.bitis.format('HH:mm'),
            molaBas: values.molaBas.format('HH:mm'),
            molaBit: values.molaBit.format('HH:mm'),
        };
        try {
            await axiosInstance.post('/attendance/settings', payload);
            message.success("Mesai ayarları güncellendi!");
            setIsSettingsModalVisible(false);
        } catch (e) { message.error("Hata oluştu."); }
    };

    // ... (Mevcut handleUpload ve Tablo Sütunların aynı kalıyor)

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4}><InboxOutlined /> Excel Puantaj Yükle</Title>
                    <Button icon={<SettingOutlined />} onClick={() => { fetchSettings(); setIsSettingsModalVisible(true); }}>
                        Mesai Ayarları
                    </Button>
                </div>
                {/* ... (Yükleme alanı ve Dragger kısmı buraya gelecek) */}
            </Card>

            {/* Mesai Ayarları Modalı */}
            <Modal
                title="Fabrika Mesai ve Mola Ayarları"
                open={isSettingsModalVisible}
                onOk={() => settingsForm.submit()}
                onCancel={() => setIsSettingsModalVisible(false)}
                okText="Ayarları Kaydet"
                cancelText="Vazgeç"
            >
                <Form form={settingsForm} layout="vertical" onFinish={handleSettingsSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="baslangic" label="Mesai Başlangıç" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="bitis" label="Mesai Bitiş" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
                        </Col>
                    </Row>
                    <Divider>Mola Saatleri (Ücretten Düşülür)</Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="molaBas" label="Mola Başlangıç" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="molaBit" label="Mola Bitiş" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* ... (Rapor ve Tablo bölümleri aynı kalıyor) */}
        </div>
    );
};

export default PuantajYukle;