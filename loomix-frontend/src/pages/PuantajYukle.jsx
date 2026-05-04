import React, { useState } from 'react';
import { Card, Typography, Upload, message, Table, Tag, Row, Col, Statistic, Alert, Button, Modal, Form, TimePicker, InputNumber, Divider } from 'antd';
import { InboxOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined, SettingOutlined, QuestionCircleOutlined, StopOutlined } from '@ant-design/icons';
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
            const { baslangic, bitis, molaBas, molaBit, tolerans, ctesiBaslangic, ctesiBitis } = res.data;
            const gecerliTolerans = (tolerans !== undefined && tolerans !== null) ? tolerans : 15;

            settingsForm.setFieldsValue({
                baslangic: dayjs(baslangic, 'HH:mm'),
                bitis: dayjs(bitis, 'HH:mm'),
                molaBas: dayjs(molaBas, 'HH:mm'),
                molaBit: dayjs(molaBit, 'HH:mm'),
                tolerans: gecerliTolerans,
                ctesiBaslangic: dayjs(ctesiBaslangic || "08:00", 'HH:mm'),
                ctesiBitis: dayjs(ctesiBitis || "13:00", 'HH:mm')
            });
        } catch (e) { console.log("Ayarlar çekilemedi."); }
    };

    const handleSettingsSave = async (values) => {
        const payload = {
            baslangic: values.baslangic.format('HH:mm'),
            bitis: values.bitis.format('HH:mm'),
            molaBas: values.molaBas.format('HH:mm'),
            molaBit: values.molaBit.format('HH:mm'),
            tolerans: values.tolerans,
            ctesiBaslangic: values.ctesiBaslangic.format('HH:mm'),
            ctesiBitis: values.ctesiBitis.format('HH:mm')
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
                headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' },
                withCredentials: true
            });
            message.success(`${file.name} başarıyla işlendi!`);
            setRapor(response.data.ozet);
            onSuccess("Ok");
        } catch (error) {
            const errMsj = error.response?.data?.mesaj || error.message || "Dosya yüklenirken hata oluştu!";
            message.error(errMsj);
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

            <Modal title="Fabrika Mesai Ayarları" open={isSettingsModalVisible} onOk={() => settingsForm.submit()} onCancel={() => setIsSettingsModalVisible(false)} width={600}>
                <Form form={settingsForm} layout="vertical" onFinish={handleSettingsSave}>
                    <Divider orientation="left">Hafta İçi (Standart Mesai)</Divider>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="baslangic" label="Mesai Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="bitis" label="Mesai Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Divider orientation="left" style={{ borderColor: '#1890ff', color: '#1890ff' }}>Hafta Sonu (Cumartesi Özel Mesaisi)</Divider>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="ctesiBaslangic" label="Cumartesi Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="ctesiBitis" label="Cumartesi Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Divider orientation="left">Mola & Tolerans</Divider>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="molaBas" label="Mola Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="molaBit" label="Mola Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="tolerans" label="Tolerans"><InputNumber min={0} style={{ width: '100%' }} addonAfter="Dk" /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {rapor && (
                <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={8}><Card><Statistic title="İşlenen Personel" value={rapor.basariliTahakkuklar?.length || 0} prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />} /></Card></Col>
                        <Col xs={24} sm={8}><Card><Statistic title="Dağıtılan Toplam" value={(rapor.basariliTahakkuklar || []).reduce((acc, curr) => acc + curr.tahakkukTutar, 0)} prefix={<DollarOutlined />} suffix="₺" styles={{ content: { color: '#3f8600' } }} /></Card></Col>
                        <Col xs={24} sm={8}><Card><Statistic title="Engellenen Mükerrer" value={rapor.zatenEklenenler?.length || 0} prefix={<StopOutlined />} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
                    </Row>

                    {/* 🚀 YENİ EKLENEN KISIM: MÜKERRER KAYIT KALKANI UYARISI */}
                    {(rapor.zatenEklenenler?.length || 0) > 0 && (
                        <Card title={<><StopOutlined style={{ color: '#fa8c16' }} /> Mükerrer (Çift) Kayıt Koruması Devrede!</>} style={{ marginBottom: 20, border: '1px solid #ffe58f' }} styles={{ body: { padding: 0 } }}>
                            <Alert message="Aşağıdaki personellerin bu tarihlerdeki maaşları daha önceden sisteme işlenmiş. Sistem ikinci kez maaş yazılmasını (çift hakedişi) ENGELLENDİ." type="warning" banner />
                            <Table
                                dataSource={rapor.zatenEklenenler || []}
                                columns={[
                                    { title: 'Personel', dataIndex: 'isim', render: val => <b>{val}</b> },
                                    { title: 'Sistem Mesajı', dataIndex: 'mesaj', render: val => <Tag color="orange">{val}</Tag> }
                                ]}
                                rowKey="isim" pagination={{ pageSize: 5 }} size="small"
                            />
                        </Card>
                    )}

                    {(rapor.eksikBasimlar?.length || 0) > 0 && (
                        <Card title={<><QuestionCircleOutlined style={{ color: '#cf1322' }} /> Sınır Dışı Kalanlar / Eksik Basımlar</>} style={{ marginBottom: 20, border: '1px solid #ffa39e' }} styles={{ body: { padding: 0 } }}>
                            <Table dataSource={rapor.eksikBasimlar || []} columns={[{ title: 'Personel', dataIndex: 'isim', render: val => <b>{val}</b> }, { title: 'Tarih', dataIndex: 'tarih' }, { title: 'Hata', dataIndex: 'mesaj', render: val => <Text type="danger">{val}</Text> }]} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="small" />
                        </Card>
                    )}

                    <Card title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> Başarılı İşlemler</>} styles={{ body: { padding: 0 } }}>
                        <Table dataSource={rapor.basariliTahakkuklar || []} columns={[{ title: 'Personel', dataIndex: 'isim' }, { title: 'Tahakkuk', dataIndex: 'tahakkukTutar', render: val => <b style={{ color: '#52c41a' }}>+ {val} ₺</b> }, { title: 'Yeni Bakiye', dataIndex: 'yeniBakiye', render: val => <b>{val} ₺</b> }]} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="small" />
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PuantajYukle;