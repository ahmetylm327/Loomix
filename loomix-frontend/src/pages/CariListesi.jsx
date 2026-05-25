import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, message, Tag, Modal, Form, Input, Row, Col, Divider, Select, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SaveOutlined, TagsOutlined, MoreOutlined } from '@ant-design/icons';

// DİKKAT: Servis fonksiyonlarının axiosInstance.js içinde olduğunu varsayıyorum.
import { getCariler, deleteCari, addCari, updateCari } from '../api/cariService';

const { Option } = Select;
const { confirm } = Modal;

const CariListesi = () => {
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCari, setEditingCari] = useState(null);
    const [form] = Form.useForm();

    // 1. VERİLERİ GETİR
    const fetchCariler = async () => {
        setLoading(true);
        try {
            const data = await getCariler();
            setCariler(data);
        } catch (error) {
            console.error("Veri çekme hatası:", error);
            message.error("Veriler sunucudan alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCariler();
    }, []);

    // 2. SİLME ONAYI VE İŞLEMİ (Mobilde Popconfirm yerine Modal Confirm daha iyi çalışır)
    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Cariyi Sil',
            content: 'Bu cari kaydını silmek istediğinize emin misiniz? (İşlem geri alınamaz)',
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
            await deleteCari(id);
            message.success('Cari kart başarıyla silindi!');
            fetchCariler();
        } catch (error) {
            message.error('Silme işlemi başarısız oldu.');
        }
    };

    // 3. MODAL AÇMA (EKLEME)
    const showAddModal = () => {
        setEditingCari(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    // 4. MODAL AÇMA (DÜZENLEME)
    const showEditModal = (record) => {
        setEditingCari(record);
        form.setFieldsValue({
            cariKodu: record.cariKodu,
            firmaAdi: record.firmaAdi,
            kategori: record.kategori,
            vergiDairesi: record.vergiDairesi,
            vergiNo: record.vergiNo,
            telefon: record.telefon,
            email: record.email
        });
        setIsModalVisible(true);
    };

    // 5. KAYDETME (EKLEME VE GÜNCELLEME)
    const handleFormSubmit = async (values) => {
        try {
            if (editingCari) {
                await updateCari(editingCari._id, values);
                message.success('Cari bilgiler güncellendi.');
            } else {
                await addCari(values);
                message.success('Yeni cari kart başarıyla oluşturuldu.');
            }
            setIsModalVisible(false);
            fetchCariler();
        } catch (error) {
            console.error("Kayıt hatası detayı:", error.response?.data);
            message.error('İşlem başarısız! Eksik alanları kontrol edin.');
        }
    };

    // 6. MOBİL UYUMLU 3 KOLONLU TABLO SÜTUNLARI
    const columns = [
        {
            title: 'Firma / Cari',
            key: 'firma',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px', color: '#222' }}>{record.firmaAdi || 'İsimsiz Cari'}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.cariKodu || 'KODSUZ'}</span>
                </div>
            )
        },
        {
            title: 'Durum',
            key: 'durum',
            render: (_, record) => {
                const bakiye = record.bakiye || 0;
                return (
                    <div>
                        <b style={{ color: bakiye < 0 ? '#cf1322' : '#3f8600', fontSize: '13px' }}>
                            {bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                        </b><br />
                        <Tag color="purple" style={{ fontSize: '10px', marginTop: '4px' }}>{record.kategori}</Tag>
                    </div>
                )
            }
        },
        {
            title: '', // Butonlar için dar açılır menü sütunu
            key: 'action',
            align: 'right',
            width: 50,
            render: (_, record) => {
                const items = [
                    { key: '1', label: 'İncele / Düzenle', icon: <EditOutlined style={{ color: '#1890ff' }} />, onClick: () => showEditModal(record) },
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
        // YENİ: Mobilde dış boşluğu (padding) azalttık
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh', overflowX: 'hidden' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}>

                {/* YENİ: Mobilde Başlık ve Butonun üst üste binmesini engelleyen Flex yapı */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}><UserOutlined /> Cari Hesaplar</span>
                    <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
                        Yeni Ekle
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={cariler}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

            <Modal
                title={editingCari ? <b><EditOutlined /> Cari Kartı Düzenle</b> : <b><PlusOutlined /> Yeni Cari Kart Ekle</b>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={700}
                centered
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: '20px' }}>

                    {/* YENİ: xs={24} ekleyerek telefonda yan yana sıkışmalarını değil, alt alta geçmelerini sağladık */}
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item label="Cari Kodu" name="cariKodu" rules={[{ required: true, message: 'Gerekli!' }]}>
                                <Input placeholder="120.01.001" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={16}>
                            <Form.Item label="Firma Ünvanı" name="firmaAdi" rules={[{ required: true, message: 'Gerekli!' }]}>
                                <Input placeholder="Firma tam adı" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24}>
                            <Form.Item label="Cari Kategorisi" name="kategori" rules={[{ required: true, message: 'Kategori seçiniz!' }]} initialValue="Müşteri">
                                <Select prefix={<TagsOutlined />}>
                                    <Option value="Müşteri">Müşteri</Option>
                                    <Option value="Tedarikçi">Tedarikçi</Option>
                                    <Option value="Toptancı">Toptancı</Option>
                                    <Option value="Personel">Personel</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider titlePlacement="left" style={{ fontSize: '12px', color: '#999', margin: '10px 0' }}>Mali ve İletişim Bilgileri</Divider>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}><Form.Item label="Vergi Dairesi" name="vergiDairesi"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Vergi / TC No" name="vergiNo"><Input /></Form.Item></Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}><Form.Item label="Telefon" name="telefon"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="E-Posta" name="email"><Input type="email" /></Form.Item></Col>
                    </Row>

                    <Row justify="end" style={{ marginTop: '10px' }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Vazgeç</Button>
                            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
                                {editingCari ? 'Güncelle' : 'Kaydet'}
                            </Button>
                        </Space>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default CariListesi;