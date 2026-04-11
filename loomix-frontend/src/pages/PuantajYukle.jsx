import React, { useState } from 'react';
import { Card, Typography, Upload, message, Table, Tag, Row, Col, Statistic, Alert } from 'antd';
import { InboxOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const PuantajYukle = () => {
    const [loading, setLoading] = useState(false);
    const [rapor, setRapor] = useState(null);

    const handleUpload = async ({ file, onSuccess, onError }) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axiosInstance.post('/attendance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success(`${file.name} başarıyla işlendi ve tahakkuklar yapıldı!`);
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

    // YENİ: Mobilde sağa-sola kaydırmayı bitiren, bilgileri alt alta birleştiren Kompakt Sütunlar
    const basariliSutunlar = [
        {
            title: 'Personel & Yevmiye',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ color: '#1890ff', fontSize: '13px' }}>{record.isim}</b><br />
                    <span style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.yevmiye} ₺ / Gün</span>
                </div>
            )
        },
        {
            title: 'Haftalık Kazanç',
            key: 'tahakkuk',
            render: (_, record) => (
                <div>
                    <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>{record.gun} Gün</Tag><br />
                    <b style={{ color: '#52c41a', fontSize: '13px' }}>+ {record.tahakkukTutar} ₺</b>
                </div>
            )
        },
        {
            title: 'Yeni Bakiye',
            dataIndex: 'yeniBakiye',
            key: 'yeniBakiye',
            align: 'right',
            render: b => <b style={{ fontSize: '14px' }}>{b} ₺</b>
        },
    ];

    // YENİ: Hata tablosunun mobilde sıkışmasını engelleyen yapı
    const bulunamayanSutunlar = [
        {
            title: 'Cihazdaki İsim',
            key: 'bilgi',
            render: (_, record) => (
                <div>
                    <Text type="danger" style={{ fontSize: '13px' }}><b>{record.isim}</b></Text><br />
                    <span style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.gun} Gün cihazda basmış</span>
                </div>
            )
        },
        {
            title: 'Aksiyon',
            key: 'aksiyon',
            align: 'right',
            render: () => <Tag color="warning" style={{ fontSize: '10px', whiteSpace: 'normal', textAlign: 'center' }}>Sisteme Kaydedin</Tag>
        }
    ];

    return (
        // YENİ: padding azaltıldı, taşma engellendi
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 20, padding: '5px' }}>
                <Title level={4} style={{ marginBottom: 5 }}><InboxOutlined /> Excel / CSV Puantaj Yükle</Title>
                <Text type="secondary" style={{ fontSize: '13px' }}>Cihazdan aldığınız dosyayı buraya yükleyin. Sistem maaşları otomatik işler.</Text>

                <div style={{ marginTop: 20 }}>
                    <Dragger {...uploadProps} disabled={loading} style={{ padding: '20px 0' }}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#1890ff', fontSize: '40px' }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '14px', padding: '0 10px' }}>Dosyayı seçmek için tıklayın</p>
                        <p className="ant-upload-hint" style={{ fontSize: '12px' }}>.xlsx, .xls, .csv desteklenir</p>
                    </Dragger>
                </div>
            </Card>

            {rapor && (
                <div>
                    {/* YENİ: xs={24} ile mobilde istatistik kartlarının alt alta düşmesi sağlandı */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={8}>
                            <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <Statistic
                                    title="İşlenen Personel"
                                    value={rapor.basariliTahakkuklar.length + rapor.sistemdeBulunamayanlar.length}
                                    prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <Statistic
                                    title="Toplam Dağıtılan Maaş"
                                    value={rapor.basariliTahakkuklar.reduce((acc, curr) => acc + curr.tahakkukTutar, 0)}
                                    precision={2}
                                    prefix={<DollarOutlined />}
                                    suffix="₺"
                                    styles={{ content: { color: '#3f8600', fontWeight: 'bold' } }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <Statistic
                                    title="Bulunamayan (Kayıtsız) Kişi"
                                    value={rapor.sistemdeBulunamayanlar.length}
                                    prefix={<WarningOutlined />}
                                    styles={{ content: { color: rapor.sistemdeBulunamayanlar.length > 0 ? '#cf1322' : '#8c8c8c' } }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {rapor.sistemdeBulunamayanlar.length > 0 && (
                        <Alert
                            title="Bazı personellerin tahakkuku yapılamadı!"
                            description="Aşağıdaki isimler cihazda var ancak sisteminizde kayıtlı değil veya harf hatası var. Lütfen bu kişileri sisteme ekleyin."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    <Card
                        title={<span style={{ fontSize: '15px' }}><CheckCircleOutlined style={{ color: '#52c41a' }} /> Başarılı İşlemler</span>}
                        style={{ marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Table
                            dataSource={rapor.basariliTahakkuklar}
                            columns={basariliSutunlar}
                            rowKey="isim"
                            pagination={{ pageSize: 5, size: 'small' }}
                            size="small"
                        />
                    </Card>

                    {rapor.sistemdeBulunamayanlar.length > 0 && (
                        <Card
                            title={<span style={{ fontSize: '15px' }}><WarningOutlined style={{ color: '#faad14' }} /> Kaydı Bulunamayanlar</span>}
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <Table
                                dataSource={rapor.sistemdeBulunamayanlar}
                                columns={bulunamayanSutunlar}
                                rowKey="isim"
                                pagination={{ pageSize: 5, size: 'small' }}
                                size="small"
                            />
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default PuantajYukle;