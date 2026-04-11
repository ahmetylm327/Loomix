import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Space, Tag, Avatar, Row, Col, Switch, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShoppingOutlined, UserOutlined, BarcodeOutlined, MoreOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const UrunListesi = () => {
    const [data, setData] = useState([]);
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUrun, setEditingUrun] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchData();
        fetchCariler();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/products');
            setData(response.data);
        } catch (error) {
            message.error("Ürünler çekilemedi!");
        } finally {
            setLoading(false);
        }
    };

    const fetchCariler = async () => {
        try {
            const response = await axiosInstance.get('/caris');
            setCariler(response.data);
        } catch (error) {
            console.error("Cariler yüklenemedi");
        }
    };

    const handleSave = async (values) => {
        try {
            if (editingUrun) {
                await axiosInstance.put(`/products/${editingUrun._id}`, values);
                message.success("Model başarıyla güncellendi!");
            } else {
                await axiosInstance.post('/products', values);
                message.success("Yeni model başarıyla eklendi!");
            }
            setIsModalVisible(false);
            setEditingUrun(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            console.error("Hata Detayı:", error.response?.data);
            message.error(`İşlem başarısız: ${error.response?.data?.description || "Eksik alan var!"}`);
        }
    };

    // YENİ: Mobilde açılır menüden silme işlemi için güvenli onay penceresi
    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Modeli Sil',
            content: 'Bu model kartını silmek istediğinize emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() {
                handleDelete(id);
            },
        });
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/products/${id}`);
            message.success("Model silindi.");
            fetchData();
        } catch (error) {
            message.error("Silme işlemi başarısız!");
        }
    };

    const showEditModal = (record) => {
        setEditingUrun(record);
        const guvenliCariId = record.cariId
            ? (typeof record.cariId === 'object' ? record.cariId._id : record.cariId)
            : undefined;

        form.setFieldsValue({
            ...record,
            cariId: guvenliCariId
        });
        setIsModalVisible(true);
    };

    const showAddModal = () => {
        setEditingUrun(null);
        form.resetFields();
        form.setFieldsValue({
            kdvOrani: 10,
            birim: 'Adet',
            aktifMi: true
        });
        setIsModalVisible(true);
    };

    // YENİ: Mobilde kusursuz görünen 3 kolonlu (Kompakt) yapı
    const columns = [
        {
            title: 'Model Bilgisi',
            key: 'modelBilgisi',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px', color: '#1890ff' }}>{record.urunAdi}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Kodu: {record.stokKodu || 'KODSUZ'}</span>
                    {record.barkod && (
                        <><br /><span style={{ fontSize: '11px', color: '#bfbfbf' }}><BarcodeOutlined /> {record.barkod}</span></>
                    )}
                </div>
            )
        },
        {
            title: 'Fiyat & Firma',
            key: 'fiyatFirma',
            render: (_, record) => {
                const cariAdi = record.cariId?.firmaAdi || "Firma Yok";
                return (
                    <div>
                        <b style={{ fontSize: '13px', color: '#3f8600' }}>
                            {record.birimFiyat?.toLocaleString('tr-TR')} ₺
                            <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 'normal' }}> +%{(record.kdvOrani || 0)} KDV</span>
                        </b><br />
                        <span style={{ fontSize: '12px', color: '#555' }}><UserOutlined style={{ fontSize: '10px' }} /> {cariAdi}</span><br />
                        <Space size={4} style={{ marginTop: 4 }}>
                            <Tag color="purple" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>{record.kategori || 'Genel'}</Tag>
                            <Tag color={record.aktifMi ? 'green' : 'red'} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>{record.aktifMi ? 'Aktif' : 'Pasif'}</Tag>
                        </Space>
                    </div>
                )
            }
        },
        {
            title: '', // Butonlar için dar sütun
            key: 'actions',
            align: 'right',
            width: 50,
            render: (_, record) => {
                const items = [
                    { key: '1', label: 'Düzenle', icon: <EditOutlined style={{ color: '#1890ff' }} />, onClick: () => showEditModal(record) },
                    { type: 'divider' },
                    { key: '2', label: 'Sil', icon: <DeleteOutlined />, danger: true, onClick: () => showDeleteConfirm(record._id) },
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
        // YENİ: Mobilde dış boşlukları (padding) azalttık
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}>

                {/* YENİ: Başlık ve Ekle butonunun telefonda alt alta esnek geçişi için flexWrap kullanıldı */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}><ShoppingOutlined /> Stok ve Modeller</span>
                    <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
                        Yeni Model Ekle
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

            <Modal
                title={editingUrun ? <b><EditOutlined /> Model Kartını Güncelle</b> : <b><PlusOutlined /> Yeni Model Kartı Tanımla</b>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                okText="Stok Kartını Kaydet"
                cancelText="Vazgeç"
                width={750}
                centered
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: '20px' }}>
                    {/* YENİ: xs={24} ile form alanları telefonda daralıp ezilmek yerine alt alta sıralanır */}
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="stokKodu" label="Stok Kodu" rules={[{ required: true, message: 'Gerekli!' }]}>
                                <Input placeholder="Örn: MDL-001" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={16}>
                            <Form.Item name="urunAdi" label="Ürün / Model Adı" rules={[{ required: true, message: 'Gerekli!' }]}>
                                <Input placeholder="Örn: Siyah Pamuklu Tişört" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="kategori" label="Kategori Sınıfı" rules={[{ required: true }]}>
                                <Select placeholder="Kategori Seçiniz">
                                    <Option value="Üst Giyim">Üst Giyim</Option>
                                    <Option value="Alt Giyim">Alt Giyim</Option>
                                    <Option value="Dış Giyim">Dış Giyim</Option>
                                    <Option value="Ev Tekstili">Ev Tekstili</Option>
                                    <Option value="Aksesuar">Aksesuar</Option>
                                    <Option value="Diğer">Diğer</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="barkod" label="Barkod No (Opsiyonel)">
                                <Input placeholder="Okutun veya yazın..." prefix={<BarcodeOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="birimFiyat" label="Dikim Bedeli (₺)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="kdvOrani" label="KDV Oranı (%)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} max={100} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="birim" label="Birim">
                                <Select>
                                    <Option value="Adet">Adet</Option>
                                    <Option value="Takım">Takım</Option>
                                    <Option value="Kilo">Kilo</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={18} sm={20}>
                            <Form.Item name="cariId" label="Ait Olduğu Firma (Müşteri)" rules={[{ required: true, message: 'Firma seçimi zorunludur!' }]}>
                                <Select placeholder="Müşteri firmayı listeden seçin..." showSearch optionFilterProp="children" size="large">
                                    {cariler.map(cari => (
                                        <Option key={cari._id} value={cari._id}>
                                            {cari.firmaAdi} ({cari.cariKodu || "Kodsuz"})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={6} sm={4}>
                            <Form.Item name="aktifMi" label="Durum" valuePropName="checked">
                                <Switch checkedChildren="Aktif" unCheckedChildren="Pasif" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default UrunListesi;