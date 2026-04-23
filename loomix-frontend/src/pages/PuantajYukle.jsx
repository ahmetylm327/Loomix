import React, { useState } from 'react';
import { Card, Typography, Upload, message, Table, Tag, Row, Col, Statistic, Alert, Button, Modal, Form, TimePicker, InputNumber, Divider } from 'antd';
import { InboxOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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
            const res = await axiosInstance.get('/attendance/settings');
            const { baslangic, bitis, molaBas, molaBit, tolerans } = res.data;
            settingsForm.setFieldsValue({
                baslangic: dayjs(baslangic, 'HH:mm'),
                bitis: dayjs(bitis, 'HH:mm'),
                molaBas: dayjs(molaBas, 'HH:mm'),
                molaBit: dayjs(molaBit, 'HH:mm'),
                tolerans: tolerans || 15
            });
        } catch (e) { console.log("Ayarlar çekilemedi."); }
    };

    const handleSettingsSave = async (values) => {
        const payload = {
            baslangic: values.baslangic.format('HH:mm'),
            bitis: values.bitis.format('HH:mm'),
            molaBas: values.molaBas.format('HH:mm'),
            molaBit: values.molaBit.format('HH:mm'),
            tolerans: values.tolerans
        };
        try {
            await axiosInstance.post('/attendance/settings', payload);
            message.success("Mesai ayarları güncellendi!");
            setIsSettingsModalVisible(false);
        } catch (e) { message.error("Hata oluştu."); }
    };

    const handleUpload = async ({ file, onSuccess, onError }) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axiosInstance.post('/attendance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            message.success(`${file.name} başarıyla işlendi!`);
            setRapor(response.data.ozet);
            onSuccess("Ok");
        } catch (error) {
            message.error(error.response?.data?.mesaj || "Dosya yüklenirken hata oluştu!");
            onError("Hata");
        } finally {
            setLoading(false);
        }
    };

    const uploadProps = {
        name: 'file',
        multiple: false,
        customRequest: handleUpload,
        accept: '.csv, .xlsx, .xls',
        showUploadList: false,
    };

    const basariliSutunlar = [
        {
            title: 'Personel',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ color: '#1890ff', fontSize: '13px' }}>{record.isim}</b>
                    {record.toleransUygulandiMi && <Tag color="cyan" style={{ marginLeft: 5, fontSize: '10px' }}>Tolerans</Tag>}
                </div>
            )
        },
        {
            title: 'Tahakkuk',
            key: 'tahakkuk',
            render: (_, record) => (
                <div>
                    <Tag color="blue" style={{ fontSize: '10px' }}>{record.gun} Gün</Tag>
                    <b style={{ color: '#52c41a', fontSize: '13px' }}>+ {record.tahakkukTutar} ₺</b>
                </div>
            )
        },
        { title: 'Yeni Bakiye', dataIndex: 'yeniBakiye', align: 'right', render: b => <b>{b} ₺</b> },
    ];

    // 🚀 YENİ: Sayılı Kayıtsız Personel Sütunları
    const bulunamayanSutunlar = [
        {
            title: 'Cihazdaki İsim & Kayıt Bilgisi',
            key: 'bilgi',
            render: (_, record) => (
                <div>
                    <Text type="danger"><b>{record.isim}</b></Text><br />
                    <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Cihazda <b style={{ color: '#000' }}>{record.basimSayisi} günlük</b> kaydı tespit edildi</span>
                </div>
            )
        },
        { title: 'Aksiyon', align: 'right', render: () => <Tag color="warning">Sisteme Ekleyin</Tag> }
    ];

    // 🚀 YENİ: Detaylı Hata Gösterimli Eksik Basım Sütunları
    const eksikBasimSutunlar = [
        { title: 'Personel', dataIndex: 'isim', render: val => <b>{val}</b> },
        {
            title: 'Giriş / Çıkış', key: 'saatler', render: (_, r) => (
                <div>
                    G: <Tag color={r.giris === '-' ? 'error' : 'default'}>{r.giris}</Tag>
                    Ç: <Tag color={r.cikis === '-' ? 'error' : 'default'}>{r.cikis}</Tag>
                </div>
            )
        },
        { title: 'Hata Nedeni', dataIndex: 'mesaj', render: val => <Text type="danger">{val}</Text> },
        { title: 'Durum', align: 'right', render: () => <Tag color="red">Maaş İşlenmedi</Tag> }
    ];

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20, padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}><InboxOutlined /> Excel Puantaj Yükle</Title>
                    <Button type="dashed" icon={<SettingOutlined />} onClick={() => { fetchSettings(); setIsSettingsModalVisible(true); }}>
                        Mesai Ayarları
                    </Button>
                </div>

                <div style={{ marginTop: 20 }}>
                    <Dragger {...uploadProps} disabled={loading} style={{ padding: '20px 0' }}>
                        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff', fontSize: '40px' }} /></p>
                        <p className="ant-upload-text" style={{ fontSize: '14px', padding: '0 10px' }}>Dosyayı seçmek için tıklayın</p>
                    </Dragger>
                </div>
            </Card>

            <Modal
                title="Fabrika Mesai ve Opsiyon Ayarları"
                open={isSettingsModalVisible}
                onOk={() => settingsForm.submit()}
                onCancel={() => setIsSettingsModalVisible(false)}
                okText="Ayarları Kaydet"
                cancelText="Vazgeç"
            >
                <Form form={settingsForm} layout="vertical" onFinish={handleSettingsSave}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="baslangic" label="Mesai Başlangıç" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="bitis" label="Mesai Bitiş" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="tolerans" label="Geç Kalma Toleransı (Dakika)" tooltip="Örn: 15 yazarsanız, 08:15'e kadar gelenlerden kesinti yapılmaz.">
                        <InputNumber min={0} max={60} style={{ width: '100%' }} size="large" addonAfter="Dakika" />
                    </Form.Item>
                    <Divider>Mola Saatleri (Ücretten Düşülür)</Divider>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="molaBas" label="Mola Başlangıç" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="molaBit" label="Mola Bitiş" rules={[{ required: true }]}><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {rapor && (
                <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={8}>
                            <Card><Statistic title="İşlenen Personel" value={rapor.basariliTahakkuklar?.length || 0} prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />} /></Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card><Statistic title="Dağıtılan Toplam" value={(rapor.basariliTahakkuklar || []).reduce((acc, curr) => acc + curr.tahakkukTutar, 0)} prefix={<DollarOutlined />} suffix="₺" styles={{ content: { color: '#3f8600' } }} /></Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card><Statistic title="Eksik Basım (Hatalı)" value={rapor.eksikBasimlar?.length || 0} prefix={<QuestionCircleOutlined />} styles={{ content: { color: (rapor.eksikBasimlar?.length || 0) > 0 ? '#cf1322' : '#8c8c8c' } }} /></Card>
                        </Col>
                    </Row>

                    {/* 🚀 SAYFALAMA GERİ GELDİ (pagination={{ pageSize: 5 }}) */}
                    {(rapor.eksikBasimlar?.length || 0) > 0 && (
                        <Card title={<><QuestionCircleOutlined style={{ color: '#cf1322' }} /> Eksik Kart Basanlar</>} style={{ marginBottom: 20, border: '1px solid #ffa39e' }} styles={{ body: { padding: 0 } }}>
                            <Alert message="Bu personeller giriş veya çıkışta kart basmayı unuttuğu için bugünkü maaşları YATIRILMADI. Personel listesinden manuel düzeltme yapınız." type="error" banner />
                            <Table dataSource={rapor.eksikBasimlar || []} columns={eksikBasimSutunlar} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="small" />
                        </Card>
                    )}

                    {(rapor.sistemdeBulunamayanlar?.length || 0) > 0 && (
                        <Card title={<><WarningOutlined style={{ color: '#faad14' }} /> Kaydı Bulunamayanlar</>} style={{ marginBottom: 20 }} styles={{ body: { padding: 0 } }}>
                            <Table dataSource={rapor.sistemdeBulunamayanlar || []} columns={bulunamayanSutunlar} rowKey="isim" pagination={{ pageSize: 5 }} size="small" />
                        </Card>
                    )}

                    <Card title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> Başarılı İşlemler</>} styles={{ body: { padding: 0 } }}>
                        <Table dataSource={rapor.basariliTahakkuklar || []} columns={basariliSutunlar} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="small" />
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PuantajYukle;