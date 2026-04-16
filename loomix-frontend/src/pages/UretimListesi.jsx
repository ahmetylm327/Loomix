import React, { useEffect, useState } from "react";
import { Table, Card, Typography, Button, Modal, Form, Select, InputNumber, DatePicker, Input, message, Tag, Space, Dropdown, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, HistoryOutlined, MoreOutlined } from "@ant-design/icons";
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const UretimListesi = () => {
    const [data, setData] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingUretim, setEditingUretim] = useState(null);

    useEffect(() => {
        fetchData();
        fetchProducts();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/production');
            setData(response.data);
        } catch (error) {
            message.error("Üretim verileri çekilemedi!");
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axiosInstance.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error("Ürünler çekilemedi");
        }
    };

    const handleSave = async (values) => {
        try {
            let formattedDate = values.productionDate.format('YYYY-MM-DD');

            const payload = {
                productId: values.productId,
                quantity: values.quantity,
                entryType: values.entryType,
                productionDate: formattedDate,
                notes: values.notes || ""
            };

            if (editingUretim) {
                await axiosInstance.put(`/production/${editingUretim._id}`, payload);
                message.success("Üretim kaydı güncellendi!");
            } else {
                await axiosInstance.post('/production', payload);
                message.success("Üretim kaydı başarıyla oluşturuldu!");
            }

            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            message.error("İşlem başarısız!");
        }
    };

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Kaydı Sil',
            content: 'Bu üretim fişini silmek istediğinize emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() {
                axiosInstance.delete(`/production/${id}`).then(() => {
                    message.success("Kayıt silindi!");
                    fetchData();
                }).catch(() => message.error("Silme başarısız!"));
            },
        });
    };

    const columns = [
        {
            title: 'Üretim Bilgisi',
            key: 'uretimBilgisi',
            render: (_, record) => {
                const urun = record.productId;
                return (
                    <div>
                        <b style={{ color: '#1890ff', fontSize: '14px' }}>{urun?.urunAdi || urun?.product_name || "Bilinmiyor"}</b><br />
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {dayjs(record.productionDate).format('DD.MM.YYYY')} - {urun?.stokKodu || 'KODSUZ'}
                        </span>
                        <div style={{ marginTop: 4 }}>
                            <Tag color={record.entryType === 'Haftalık' ? 'orange' : 'cyan'} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                                {record.entryType}
                            </Tag>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Miktar & Tutar',
            key: 'miktarTutar',
            align: 'right',
            render: (_, record) => {
                const q = record.quantity || 0;
                const price = record.productId?.birimFiyat || 0;
                const total = q * price;
                return (
                    <div>
                        <b style={{ fontSize: '14px', color: '#3f8600' }}>{q.toLocaleString('tr-TR')} Adet</b><br />
                        <Tag color="green" style={{ fontSize: '12px', marginTop: 4, marginRight: 0 }}>
                            {total.toLocaleString('tr-TR')} ₺
                        </Tag>
                    </div>
                );
            }
        },
        {
            title: '',
            key: 'actions',
            width: 50,
            align: 'right',
            render: (_, record) => {
                const items = [
                    {
                        key: '1',
                        label: 'Düzenle',
                        icon: <EditOutlined style={{ color: '#1890ff' }} />,
                        onClick: () => {
                            setEditingUretim(record);
                            form.setFieldsValue({ ...record, productionDate: dayjs(record.productionDate) });
                            setIsModalVisible(true);
                        }
                    },
                    {
                        key: '2',
                        label: 'Yazdır',
                        icon: <PrinterOutlined style={{ color: '#52c41a' }} />,
                        onClick: () => message.info("Yazdırma işlemi başlatılıyor...")
                    },
                    { type: 'divider' },
                    {
                        key: '3',
                        label: 'Sil',
                        icon: <DeleteOutlined />,
                        danger: true,
                        onClick: () => showDeleteConfirm(record._id)
                    },
                ];

                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px', color: '#595959' }} />} />
                    </Dropdown>
                );
            }
        }
    ];

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card
                variant="borderless"
                style={{ borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '5px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Space>
                        <HistoryOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Üretim Fişleri</span>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingUretim(null);
                        form.resetFields();
                        setIsModalVisible(true);
                    }}>
                        Yeni Fiş Ekle
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={data}
                    // YENİ: "Each child in a list should have a unique key prop" hatasını kökten çözen satır
                    rowKey={(record) => record._id || record.id || record.productId?._id}
                    loading={loading}
                    size="middle"
                    pagination={{ pageSize: 15, size: 'small' }}
                    summary={pageData => {
                        let totalQty = 0;
                        let totalAmount = 0;
                        pageData.forEach(({ quantity, productId }) => {
                            totalQty += quantity || 0;
                            totalAmount += (quantity || 0) * (productId?.birimFiyat || 0);
                        });
                        return (
                            <Table.Summary fixed>
                                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                    <Table.Summary.Cell index={0}>SAYFA TOPLAMI</Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">
                                        <div style={{ color: '#3f8600' }}>{totalQty.toLocaleString()} Adet</div>
                                        <div style={{ color: '#cf1322', marginTop: 4 }}>{totalAmount.toLocaleString()} ₺</div>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                                </Table.Summary.Row>
                            </Table.Summary>
                        );
                    }}
                />
            </Card>

            <Modal
                title={editingUretim ? <b><EditOutlined /> Üretim Fişi Düzenle</b> : <b><PlusOutlined /> Yeni Üretim Girişi</b>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                width={500}
                centered
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: '15px' }}>
                    <Form.Item name="productId" label="Model (Ürün Seçimi)" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Model Ara..." optionFilterProp="children" size="large">
                            {products.map(p => (
                                <Option key={p._id} value={p._id}>
                                    {p.urunAdi} - {p.stokKodu}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="quantity" label="Üretilen Adet" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} size="large" placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                        </Col>
                    </Row>

                    <Form.Item name="productionDate" label="Üretim Tarihi" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} size="large" format="DD.MM.YYYY" />
                    </Form.Item>

                    <Form.Item name="notes" label="Açıklama">
                        <Input.TextArea rows={2} placeholder="Vardiya veya parti no..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UretimListesi;