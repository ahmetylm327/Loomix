import React, { useState } from 'react';
import { Card, Typography, Upload, message, Table, Tag, Row, Col, Statistic, Alert, Button, Modal, Form, TimePicker, InputNumber, Divider, Space } from 'antd';
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

    // 🚀 DETAYLI TABLO SÜTUNLARI GERİ GELDİ!
    const basariliSutunlar = [
        {
            title: 'Personel Adı',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ color: '#1890ff', fontSize: '14px' }}>{record.isim}</b>
                </div>
            )
        },
        {
            title: 'Hakediş & Tahakkuk',
            key: 'tahakkuk',
            render: (_, record) => (
                <div>
                    <Tag color="blue" style={{ fontSize: '12px' }}>Toplam {record.gun} Günlük</Tag>
                    <b style={{ color: '#52c41a', fontSize: '15px', marginLeft: '8px' }}>+ {record.tahakkukTutar} ₺</b>
                </div>
            )
        },
        {
            title: 'Yeni Bakiye',
            dataIndex: 'yeniBakiye',
            align: 'right',
            render: b => <b style={{ fontSize: '15px' }}>{b} ₺</b>
        },
    ];

    const bulunamayanSutunlar = [
        {
            title: 'Cihazdaki İsim & Kayıt Bilgisi',
            key: 'bilgi',
            render: (_, record) => (
                <div>
                    <Text type="danger"><b>{record.isim}</b></Text><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Cihazda <b style={{ color: '#000' }}>{record.basimSayisi || record.gun || 1}</b> kez kayıt tespit edildi.
                    </span>
                </div>
            )
        },
        {
            title: 'Aksiyon',
            align: 'right',
            render: () => <Tag color="warning" style={{ fontSize: '12px' }}>Sisteme Ekleyin</Tag>
        }
    ];

    const eksikBasimSutunlar = [
        {
            title: 'Personel',
            dataIndex: 'isim',
            render: val => <b>{val}</b>
        },
        {
            title: 'Hatalı Tarih',
            dataIndex: 'tarih',
            render: val => <Tag color="blue">{val || '-'}</Tag>
        },
        {
            title: 'Giriş / Çıkış Saati',
            key: 'saatler',
            render: (_, r) => (
                <Space>
                    <Tag color={r.giris === '-' ? 'error' : 'default'}>G: {r.giris}</Tag>
                    <Tag color={r.cikis === '-' ? 'error' : 'default'}>Ç: {r.cikis}</Tag>
                </Space>
            )
        },
        {
            title: 'Sistem Mesajı',
            dataIndex: 'mesaj',
            render: val => <Text type="danger" style={{ fontSize: '12px' }}>{val}</Text>
        },
        {
            title: 'Durum',
            align: 'right',
            render: () => <Tag color="red">Maaş İşlenmedi</Tag>
        }
    ];

    const mukerrerSutunlar = [
        {
            title: 'Personel',
            dataIndex: 'isim',
            render: val => <b style={{ color: '#d46b08' }}>{val}</b>
        },
        {
            title: 'Sistem Koruması Mesajı',
            dataIndex: 'mesaj',
            render: val => <Tag color="orange" style={{ fontSize: '12px' }}>{val}</Tag>
        },
        {
            title: 'Aksiyon',
            align: 'right',
            render: () => <Tag color="default">İşlem Pas Geçildi</Tag>
        }
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20, padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}><InboxOutlined /> Excel Puantaj Yükle</Title>
                    <Button type="primary" icon={<SettingOutlined />} onClick={() => { fetchSettings(); setIsSettingsModalVisible(true); }}>
                        Mesai Ayarları
                    </Button>
                </div>

                <div style={{ marginTop: 20 }}>
                    <Dragger {...uploadProps} disabled={loading} style={{ padding: '30px 0', background: '#fafafa', border: '2px dashed #d9d9d9' }}>
                        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff', fontSize: '48px' }} /></p>
                        <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: '500' }}>Cihazdan aldığınız Excel dosyasını buraya sürükleyin veya tıklayın</p>
                    </Dragger>
                </div>
            </Card>

            <Modal title="Fabrika Mesai Ayarları" open={isSettingsModalVisible} onOk={() => settingsForm.submit()} onCancel={() => setIsSettingsModalVisible(false)} width={650} okText="Ayarları Kaydet" cancelText="İptal">
                <Form form={settingsForm} layout="vertical" onFinish={handleSettingsSave}>
                    <Divider orientation="left">Hafta İçi (Standart Mesai)</Divider>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="baslangic" label="Mesai Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="bitis" label="Mesai Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                    </Row>
                    <Divider orientation="left" style={{ borderColor: '#1890ff', color: '#1890ff' }}>Hafta Sonu (Cumartesi Özel Mesaisi)</Divider>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="ctesiBaslangic" label="Cumartesi Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="ctesiBitis" label="Cumartesi Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                    </Row>
                    <Divider orientation="left">Mola & Tolerans</Divider>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="molaBas" label="Mola Başlangıç"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="molaBit" label="Mola Bitiş"><TimePicker format="HH:mm" style={{ width: '100%' }} size="large" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="tolerans" label="Tolerans (Dk)"><InputNumber min={0} style={{ width: '100%' }} size="large" addonAfter="Dk" /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {rapor && (
                <div>
                    {/* 🚀 ÜST İSTATİSTİK KARTLARI */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={12} sm={6}><Card style={{ borderLeft: '4px solid #1890ff' }}><Statistic title="İşlenen" value={rapor.basariliTahakkuklar?.length || 0} prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />} /></Card></Col>
                        <Col xs={12} sm={6}><Card style={{ borderLeft: '4px solid #faad14' }}><Statistic title="Kayıtsız" value={rapor.sistemdeBulunamayanlar?.length || 0} prefix={<WarningOutlined />} styles={{ content: { color: '#faad14' } }} /></Card></Col>
                        <Col xs={12} sm={6}><Card style={{ borderLeft: '4px solid #cf1322' }}><Statistic title="Eksik/Hatalı" value={rapor.eksikBasimlar?.length || 0} prefix={<QuestionCircleOutlined />} styles={{ content: { color: '#cf1322' } }} /></Card></Col>
                        <Col xs={12} sm={6}><Card style={{ borderLeft: '4px solid #fa8c16' }}><Statistic title="Mükerrer" value={rapor.zatenEklenenler?.length || 0} prefix={<StopOutlined />} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
                    </Row>

                    {/* 1. MÜKERRER KAYIT KALKANI UYARISI */}
                    {(rapor.zatenEklenenler?.length || 0) > 0 && (
                        <Card title={<><StopOutlined style={{ color: '#fa8c16' }} /> Mükerrer (Çift) Kayıt Koruması Devrede!</>} style={{ marginBottom: 20, border: '1px solid #ffe58f' }} styles={{ header: { background: '#fffbe6' }, body: { padding: 0 } }}>
                            <Alert message="Aşağıdaki personellerin bu tarihlerdeki maaşları daha önceden sisteme işlenmiş. İkinci kez maaş yazılması ENGELLENDİ." type="warning" banner />
                            <Table dataSource={rapor.zatenEklenenler || []} columns={mukerrerSutunlar} rowKey="isim" pagination={{ pageSize: 5 }} size="middle" />
                        </Card>
                    )}

                    {/* 2. SİSTEMDE KAYDI OLMAYANLAR */}
                    {(rapor.sistemdeBulunamayanlar?.length || 0) > 0 && (
                        <Card title={<><WarningOutlined style={{ color: '#faad14' }} /> Kaydı Bulunamayanlar</>} style={{ marginBottom: 20, border: '1px solid #ffe58f' }} styles={{ body: { padding: 0 } }}>
                            <Alert message="Bu isimler Excel'de var ancak sizin Personel listenizde kayıtlı değil veya isimleri yanlış yazılmış." type="warning" banner />
                            <Table dataSource={rapor.sistemdeBulunamayanlar || []} columns={bulunamayanSutunlar} rowKey="isim" pagination={{ pageSize: 5 }} size="middle" />
                        </Card>
                    )}

                    {/* 3. SINIR DIŞI KALANLAR */}
                    {(rapor.eksikBasimlar?.length || 0) > 0 && (
                        <Card title={<><QuestionCircleOutlined style={{ color: '#cf1322' }} /> Sınır Dışı Kalanlar / Eksik Basımlar</>} style={{ marginBottom: 20, border: '1px solid #ffa39e' }} styles={{ header: { background: '#fff1f0' }, body: { padding: 0 } }}>
                            <Table dataSource={rapor.eksikBasimlar || []} columns={eksikBasimSutunlar} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="middle" />
                        </Card>
                    )}

                    {/* 4. BAŞARILI İŞLEMLER */}
                    <Card title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> Başarılı İşlemler</>} styles={{ border: '1px solid #b7eb8f', header: { background: '#f6ffed' }, body: { padding: 0 } }}>
                        <Table dataSource={rapor.basariliTahakkuklar || []} columns={basariliSutunlar} rowKey={(r, i) => r.isim + i} pagination={{ pageSize: 5 }} size="middle" />
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PuantajYukle;