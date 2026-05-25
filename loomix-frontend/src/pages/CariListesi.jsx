import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, message, Tag, Modal, Form, Input, Row, Col, Divider, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SaveOutlined, TagsOutlined, MoreOutlined } from '@ant-design/icons';
import { getCariler, deleteCari, addCari, updateCari } from '../api/cariService';
import ParaInput from '../pages/ParaInput'; // ParaInput bileşeninin yolu

const { Option } = Select;
const { confirm } = Modal;

const CariListesi = () => {
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCari, setEditingCari] = useState(null);
    const [form] = Form.useForm();

    // Para formatlayıcı
    const formatPara = (val) => val?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

    const fetchCariler = async () => {
        setLoading(true);
        try {
            const data = await getCariler();
            setCariler(data);
        } catch (error) {
            message.error("Veriler sunucudan alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCariler(); }, []);

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Cariyi Sil',
            content: 'Bu cari kaydını silmek istediğinize emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            onOk() { handleDelete(id); },
        });
    };

    const handleDelete = async (id) => {
        try {
            await deleteCari(id);
            message.success('Cari kart başarıyla silindi!');
            fetchCariler();
        } catch (error) {
            message.error('Silme işlemi başarısız.');
        }
    };

    const handleFormSubmit = async (values) => {
        try {
            if (editingCari) {
                await updateCari(editingCari._id, values);
                message.success('Cari bilgiler güncellendi.');
            } else {
                await addCari(values);
                message.success('Yeni cari kart oluşturuldu.');
            }
            setIsModalVisible(false);
            fetchCariler();
        } catch (error) {
            message.error('İşlem başarısız!');
        }
    };

    const columns = [
        {
            title: 'Firma / Cari',
            key: 'firma',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px' }}>{record.firmaAdi}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.cariKodu}</span>
                </div>
            )
        },
        {
            title: 'Güncel Bakiye',
            key: 'bakiye',
            align: 'right',
            render: (_, record) => (
                <div>
                    <b style={{ color: (record.bakiye || 0) < 0 ? '#cf1322' : '#3f8600' }}>
                        {formatPara(record.bakiye || 0)}
                    </b><br />
                    <Tag color="purple" style={{ fontSize: '10px' }}>{record.kategori}</Tag>
                </div>
            )
        },
        {
            key: 'action',
            align: 'right',
            render: (_, record) => (
                <Button type="text" icon={<MoreOutlined />} onClick={() => {
                    setEditingCari(record);
                    form.setFieldsValue(record);
                    setIsModalVisible(true);
                }} />
            )
        }
    ];

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}><UserOutlined /> Cari Hesaplar</span>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCari(null); form.resetFields(); setIsModalVisible(true); }}>Yeni Ekle</Button>
                </div>
                <Table columns={columns} dataSource={cariler} loading={loading} rowKey="_id" pagination={{ pageSize: 10 }} />
            </Card>

            <Modal title={editingCari ? 'Düzenle' : 'Yeni Cari'} open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={600}>
                <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item label="Cari Kodu" name="cariKodu"><Input /></Form.Item></Col>
                        <Col span={16}><Form.Item label="Firma Ünvanı" name="firmaAdi"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Başlangıç Bakiyesi" name="bakiye">
                                <ParaInput placeholder="0,00" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Kategori" name="kategori">
                                <Select>
                                    <Option value="Müşteri">Müşteri</Option>
                                    <Option value="Tedarikçi">Tedarikçi</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row justify="end">
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Kaydet</Button>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default CariListesi;