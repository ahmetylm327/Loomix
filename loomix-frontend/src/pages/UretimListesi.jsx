import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Select, InputNumber, DatePicker, Input, message, Row, Col, Typography, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, FileDoneOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const UretimGirisi = () => {
    const [uretimler, setUretimler] = useState([]);
    const [urunler, setUrunler] = useState([]);
    const [cariler, setCariler] = useState([]); // 🚀 YENİ: Firmaları tutacağımız liste
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // Sayfa açıldığında verileri getir
    useEffect(() => {
        verileriGetir();
    }, []);

    const verileriGetir = async () => {
        setLoading(true);
        try {
            // Üretimleri, Ürünleri ve Firmaları (Carileri) aynı anda çekiyoruz
            const [uretimRes, urunRes, cariRes] = await Promise.all([
                axiosInstance.get('/production'),
                axiosInstance.get('/products'),
                axiosInstance.get('/caris') // 🚀 YENİ: Firmaları çeken istek
            ]);

            setUretimler(uretimRes.data);
            setUrunler(urunRes.data);
            setCariler(cariRes.data);
        } catch (error) {
            message.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleUretimEkle = async (values) => {
        try {
            const payload = {
                ...values,
                productionDate: values.productionDate.format('YYYY-MM-DD')
            };

            await axiosInstance.post('/production', payload);
            message.success("Üretim fişi kesildi ve Cari hesaba borç olarak yansıdı!");
            setIsModalVisible(false);
            form.resetFields();
            verileriGetir(); // Tabloyu güncelle
        } catch (error) {
            message.error("Üretim eklenirken hata oluştu!");
        }
    };

    const handleSil = async (id) => {
        try {
            await axiosInstance.delete(`/production/${id}`);
            message.success("Üretim fişi silindi.");
            verileriGetir();
        } catch (error) {
            message.error("Silme işlemi başarısız.");
        }
    };

    const columns = [
        {
            title: 'Tarih',
            dataIndex: 'productionDate',
            render: (text) => <b>{dayjs(text).format('DD.MM.YYYY')}</b>,
        },
        {
            title: 'Firma (Cari)',
            dataIndex: ['cariId', 'firmaAdi'], // 🚀 YENİ: Arka plandan gelen firma adını gösterir
            render: (text) => <Tag color="blue">{text || 'Bilinmiyor'}</Tag>
        },
        {
            title: 'Ürün Türü',
            dataIndex: ['productId', 'urunAdi'],
            render: (text) => <b>{text || 'Silinmiş Ürün'}</b>
        },
        {
            title: 'Adet',
            dataIndex: 'quantity',
            align: 'right',
            render: (val) => <Tag color="green" style={{ fontSize: '14px' }}>{val} Adet</Tag>
        },
        {
            title: 'Türü',
            dataIndex: 'entryType',
            render: (text) => <Tag color={text === 'Günlük' ? 'default' : 'purple'}>{text}</Tag>
        },
        {
            title: 'Notlar',
            dataIndex: 'notes',
        },
        {
            title: 'İşlem',
            align: 'right',
            render: (_, record) => (
                <Popconfirm title="Bu fişi silmek istediğinize emin misiniz?" onConfirm={() => handleSil(record._id)} okText="Evet" cancelText="Hayır">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}><FileDoneOutlined /> Üretim (Fiş) Girişi</Title>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} size="large">
                            Yeni Fiş Kes
                        </Button>
                    </Col>
                </Row>

                <Table
                    dataSource={uretimler}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="Yeni Üretim Fişi Girişi"
                open={isModalVisible}
                onOk={() => form.submit()}
                onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
                okText="Fişi Kaydet ve Borçlandır"
                cancelText="İptal"
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleUretimEkle} initialValues={{ entryType: 'Günlük', productionDate: dayjs() }}>
                    <Row gutter={16}>
                        {/* 🚀 KUTSAL BAĞLANTI: Firma (Cari) Seçimi */}
                        <Col span={24}>
                            <Form.Item name="cariId" label="Firma (Kime Dikildi?)" rules={[{ required: true, message: 'Lütfen bir firma seçin!' }]}>
                                <Select placeholder="Firma Seçin" showSearch optionFilterProp="children" size="large">
                                    {cariler.map(cari => (
                                        <Option key={cari._id} value={cari._id}>{cari.firmaAdi}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={16}>
                            <Form.Item name="productId" label="Dikilen Ürün" rules={[{ required: true, message: 'Lütfen ürün seçin!' }]}>
                                <Select placeholder="Ürün Seçin" size="large">
                                    {urunler.map(urun => (
                                        <Option key={urun._id} value={urun._id}>{urun.urunAdi} ({urun.birimFiyat} ₺)</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="quantity" label="Adet" rules={[{ required: true, message: 'Adet girin!' }]}>
                                <InputNumber min={1} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="productionDate" label="Fiş Tarihi" rules={[{ required: true, message: 'Tarih seçin!' }]}>
                                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" size="large" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="entryType" label="Kayıt Tipi">
                                <Select size="large">
                                    <Option value="Günlük">Günlük Üretim</Option>
                                    <Option value="Haftalık">Haftalık Toplu Fiş</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Notlar (Opsiyonel)">
                        <TextArea rows={2} placeholder="Sipariş detayı, renk vb. notlar girebilirsiniz..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UretimGirisi;