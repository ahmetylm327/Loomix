import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Select, InputNumber, DatePicker, Input, message, Row, Col, Typography, Tag, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, FileDoneOutlined, FilterOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const UretimListesi = () => {
    const [uretimler, setUretimler] = useState([]);
    const [urunler, setUrunler] = useState([]);
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // 🚀 FİLTRELEME STATE'LERİ
    const [dateRange, setDateRange] = useState(null);
    const [selectedFirma, setSelectedFirma] = useState(null);

    // 🚀 YENİ: Stok kodu arama state'leri
    const [stokArama, setStokArama] = useState('');
    const [bulunanUrun, setBulunanUrun] = useState(null);

    useEffect(() => {
        verileriGetir();
    }, []);

    const verileriGetir = async () => {
        setLoading(true);
        try {
            const [uretimRes, urunRes, cariRes] = await Promise.all([
                axiosInstance.get('/production'),
                axiosInstance.get('/products'),
                axiosInstance.get('/caris')
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

    // 🚀 YENİ: Stok kodu arama fonksiyonu
    const handleStokKoduAra = (value) => {
        setStokArama(value);
        if (!value || value.length < 2) {
            setBulunanUrun(null);
            return;
        }
        const bulunan = urunler.find(u => u.stokKodu?.toLowerCase() === value.toLowerCase());
        if (bulunan) {
            setBulunanUrun(bulunan);
            form.setFieldsValue({ productId: bulunan._id, birimFiyat: bulunan.birimFiyat });
        } else {
            setBulunanUrun(null);
        }
    };

    const handleUrunDegisimi = (urunId) => {
        const secilenUrun = urunler.find(u => u._id === urunId);
        if (secilenUrun) {
            form.setFieldsValue({ birimFiyat: secilenUrun.birimFiyat });
            // 🚀 YENİ: Ürün seçince stok kodunu da doldur
            setStokArama(secilenUrun.stokKodu || '');
            setBulunanUrun(secilenUrun);
        }
    };

    const handleUretimEkle = async (values) => {
        try {
            const payload = {
                ...values,
                productionDate: values.productionDate.format('YYYY-MM-DD')
            };
            await axiosInstance.post('/production', payload);
            message.success("Fiş başarıyla kesildi ve firma bakiyesine yansıdı!");
            setIsModalVisible(false);
            form.resetFields();
            // 🚀 YENİ: Modal kapanınca stok arama sıfırla
            setStokArama('');
            setBulunanUrun(null);
            verileriGetir();
        } catch (error) {
            message.error("Üretim eklenirken hata oluştu!");
        }
    };

    const handleSil = async (id) => {
        try {
            await axiosInstance.delete(`/production/${id}`);
            message.success("Fiş silindi ve firma bakiyesi güncellendi.");
            verileriGetir();
        } catch (error) {
            message.error("Silme işlemi başarısız.");
        }
    };

    // 🚀 FİLTRELEME MANTIĞI
    const filteredUretimler = uretimler.filter(item => {
        let dateMatch = true;
        let firmaMatch = true;

        if (dateRange && dateRange[0] && dateRange[1]) {
            const itemDate = dayjs(item.productionDate);
            dateMatch = itemDate.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'), null, '[]');
        }

        if (selectedFirma) {
            firmaMatch = item.cariId?._id === selectedFirma;
        }

        return dateMatch && firmaMatch;
    });

    const toplamFiltreliTutar = filteredUretimler.reduce((acc, curr) => acc + (curr.quantity * (curr.birimFiyat || 0)), 0);

    const columns = [
        { title: 'Tarih', dataIndex: 'productionDate', render: (text) => <b>{dayjs(text).format('DD.MM.YYYY')}</b> },
        { title: 'Firma', dataIndex: ['cariId', 'firmaAdi'], render: (text) => <Tag color="blue">{text || 'Bilinmiyor'}</Tag> },
        { title: 'Ürün', dataIndex: ['productId', 'urunAdi'], render: (text) => <b>{text || 'Silinmiş Ürün'}</b> },
        { title: 'Adet', dataIndex: 'quantity', align: 'right' },
        { title: 'Birim Fiyat', dataIndex: 'birimFiyat', align: 'right', render: (val) => <Tag color="cyan">{val} ₺</Tag> },
        { title: 'Fiş Tutarı', align: 'right', render: (_, record) => <b style={{ color: '#52c41a' }}>{(record.quantity * (record.birimFiyat || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</b> },
        { title: 'Notlar', dataIndex: 'notes' },
        {
            title: 'İşlem', align: 'right', render: (_, record) => (
                <Popconfirm title="Bu fişi silerseniz bakiyeden düşecek, emin misiniz?" onConfirm={() => handleSil(record._id)} okText="Evet" cancelText="Hayır">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        },
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                    <Title level={4}><FileDoneOutlined /> Üretim Fişleri</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>Yeni Fiş Kes</Button>
                </Row>

                <div style={{ background: '#fafafa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e8e8e8' }}>
                    <Row gutter={16} align="middle">
                        <Col><b style={{ color: '#595959' }}><FilterOutlined /> Filtrele:</b></Col>
                        <Col span={8}><RangePicker style={{ width: '100%' }} format="DD.MM.YYYY" onChange={(dates) => setDateRange(dates)} /></Col>
                        <Col span={8}>
                            <Select style={{ width: '100%' }} placeholder="Firma Seçin" allowClear showSearch optionFilterProp="children" onChange={(val) => setSelectedFirma(val)}>
                                {cariler.map(cari => (<Option key={cari._id} value={cari._id}>{cari.firmaAdi}</Option>))}
                            </Select>
                        </Col>
                    </Row>
                </div>

                <Table dataSource={filteredUretimler} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }}
                    summary={() => (
                        <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                            <Table.Summary.Cell index={0} colSpan={5} align="right">Toplam:</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><span style={{ color: '#52c41a', fontSize: '16px' }}>{toplamFiltreliTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={2}></Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />
            </Card>

            <Modal title="Yeni Üretim Fişi" open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setStokArama(''); setBulunanUrun(null); }} width={700}>
                <Form form={form} layout="vertical" onFinish={handleUretimEkle} initialValues={{ productionDate: dayjs() }}>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="cariId" label="Firma" rules={[{ required: true }]}>
                                <Select showSearch optionFilterProp="children">
                                    {cariler.map(c => <Option key={c._id} value={c._id}>{c.firmaAdi}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>

                        {/* 🚀 YENİ: Stok Kodu arama alanı */}
                        <Col span={6}>
                            <Form.Item label="Stok Kodu">
                                <Input
                                    placeholder="SKT-001"
                                    value={stokArama}
                                    onChange={(e) => handleStokKoduAra(e.target.value)}
                                    style={{ fontFamily: 'monospace', fontWeight: 'bold', borderColor: bulunanUrun ? '#52c41a' : undefined }}
                                    suffix={
                                        bulunanUrun ? <span style={{ color: '#52c41a', fontSize: '11px' }}>✓</span>
                                            : stokArama.length >= 2 ? <span style={{ color: '#ff4d4f', fontSize: '11px' }}>?</span>
                                                : null
                                    }
                                />
                            </Form.Item>
                        </Col>

                        <Col span={10}>
                            <Form.Item name="productId" label="Ürün" rules={[{ required: true }]}>
                                <Select onChange={handleUrunDegisimi}>
                                    {urunler.map(u => <Option key={u._id} value={u._id}>{u.urunAdi}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={4}><Form.Item name="birimFiyat" label="Fiyat" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={4}><Form.Item name="quantity" label="Adet" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="productionDate" label="Tarih"><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="notes" label="Not"><TextArea /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UretimListesi;