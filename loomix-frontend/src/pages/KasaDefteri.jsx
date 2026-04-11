import React, { useEffect, useState } from 'react';
import {
    Table, Card, Typography, Button, Modal, Form, Select,
    InputNumber, DatePicker, Input, message, Tag, Row, Col,
    Statistic, Space, Dropdown
} from 'antd';
import {
    PlusOutlined, WalletOutlined, ArrowUpOutlined,
    ArrowDownOutlined, EditOutlined, DeleteOutlined, MoreOutlined
} from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const KasaDefteri = () => {
    const [data, setData] = useState([]);
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingOdeme, setEditingOdeme] = useState(null);
    const [stats, setStats] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0 });

    useEffect(() => {
        fetchData();
        fetchCariler();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/payments');
            const islemler = response.data;
            setData(islemler);

            let gelir = 0;
            let gider = 0;
            islemler.forEach(islem => {
                const tutarVal = Number(islem.tutar || islem.amount) || 0;
                const yon = islem.islemYonu || islem.transactionType;
                if (yon === 'Gelir') gelir += tutarVal;
                else if (yon === 'Gider') gider += tutarVal;
            });

            setStats({ toplamGelir: gelir, toplamGider: gider, netBakiye: gelir - gider });
        } catch (error) {
            message.error("Kasa hareketleri yüklenemedi!");
        } finally { setLoading(false); }
    };

    const fetchCariler = async () => {
        try {
            const response = await axiosInstance.get('/caris');
            setCariler(response.data);
        } catch (error) { console.log("Cari listesi alınamadı."); }
    };

    const handleSave = async (values) => {
        try {
            // YENİ: Backend'in notları yutmaması için hem notlar hem notes olarak gönderiyoruz
            const payload = {
                islemYonu: values.islemYonu,
                tutar: values.tutar,
                kategori: values.kategori,
                odemeTipi: values.odemeTipi,
                relatedId: values.relatedId,
                odemeTarihi: values.odemeTarihi ? values.odemeTarihi.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                notlar: values.notlar || "",
                notes: values.notlar || ""
            };

            const currentId = editingOdeme?._id || editingOdeme?.transactionId;

            if (editingOdeme && currentId) {
                await axiosInstance.put(`/payments/${currentId}`, payload);
                message.success("Kasa işlemi güncellendi.");
            } else {
                await axiosInstance.post('/payments', payload);
                message.success("İşlem kasaya başarıyla işlendi.");
            }
            setIsModalVisible(false);
            setEditingOdeme(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.description || "Kayıt başarısız! Eksik alanları kontrol edin.");
        }
    };

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Kasa İşlemini Sil',
            content: 'Bu kasa işlemini silmek istediğinize emin misiniz? Bakiye yeniden hesaplanacaktır.',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() {
                axiosInstance.delete(`/payments/${id}`).then(() => {
                    message.success("İşlem başarıyla silindi!");
                    fetchData();
                }).catch(() => message.error("Silme işlemi başarısız!"));
            },
        });
    };

    const columns = [
        {
            title: 'İşlem Detayı',
            key: 'detay',
            render: (_, record) => {
                const cariId = typeof record.relatedId === 'object' ? record.relatedId?._id : record.relatedId;
                const cari = cariler.find(c => c._id === cariId);
                const tip = record.islemYonu || record.transactionType;

                // YENİ: Veritabanından hangi isimle gelirse gelsin yakalama motoru
                const gosterilecekNot = record.notlar || record.notes || record.aciklama || record.description;

                return (
                    <div>
                        <b style={{ fontSize: '14px', color: '#1890ff' }}>{cari ? cari.firmaAdi : 'Genel Kasa'}</b><br />
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {dayjs(record.odemeTarihi || record.paymentDate).format('DD.MM.YYYY')} - {record.kategori || 'Genel'}
                        </span>

                        {/* YENİ: Garantili Not Gösterimi ve Taşma Engelleme */}
                        {gosterilecekNot && (
                            <div style={{
                                fontSize: '11px',
                                color: '#595959',
                                fontStyle: 'italic',
                                marginTop: 4,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                background: '#fafafa',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                borderLeft: '2px solid #d9d9d9'
                            }}>
                                {gosterilecekNot}
                            </div>
                        )}

                        <div style={{ marginTop: 6 }}>
                            <Tag color={tip === 'Gelir' ? 'success' : 'error'} icon={tip === 'Gelir' ? <ArrowUpOutlined /> : <ArrowDownOutlined />} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                                {tip === 'Gelir' ? 'TAHSİLAT' : 'ÖDEME'}
                            </Tag>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Tutar',
            key: 'tutar',
            align: 'right',
            render: (_, record) => {
                const tutarVal = record.tutar || record.amount;
                const tip = record.islemYonu || record.transactionType;
                return (
                    <b style={{ color: tip === 'Gelir' ? '#52c41a' : '#ff4d4f', fontSize: '15px' }}>
                        {tip === 'Gelir' ? '+' : '-'}{tutarVal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </b>
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
                            setEditingOdeme(record);
                            form.setFieldsValue({
                                ...record,
                                islemYonu: record.islemYonu || record.transactionType,
                                tutar: record.tutar || record.amount,
                                kategori: record.kategori || record.category,
                                odemeTipi: record.odemeTipi || record.paymentType,
                                odemeTarihi: dayjs(record.odemeTarihi || record.paymentDate),
                                relatedId: record.relatedId?._id || record.relatedId,
                                notlar: record.notlar || record.notes || record.aciklama // Düzenlerken kutuya geri dolsun
                            });
                            setIsModalVisible(true);
                        }
                    },
                    { type: 'divider' },
                    {
                        key: '2',
                        label: 'Sil',
                        icon: <DeleteOutlined />,
                        danger: true,
                        onClick: () => showDeleteConfirm(record._id || record.transactionId)
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
        <div style={{ padding: '15px', background: '#f5f5f5', minHeight: '100vh', overflowX: 'hidden' }}>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #52c41a', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Toplam Tahsilat" value={stats.toplamGelir} precision={2} styles={{ content: { color: '#52c41a' } }} prefix={<ArrowUpOutlined />} suffix="₺" />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #ff4d4f', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Toplam Ödeme" value={stats.toplamGider} precision={2} styles={{ content: { color: '#ff4d4f' } }} prefix={<ArrowDownOutlined />} suffix="₺" />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #1890ff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Kasa Mevcudu" value={stats.netBakiye} precision={2} styles={{ content: { color: '#1890ff' } }} prefix={<WalletOutlined />} suffix="₺" />
                    </Card>
                </Col>
            </Row>

            <Card
                variant="borderless"
                style={{ borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '5px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Space>
                        <WalletOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Kasa Defteri</span>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingOdeme(null); form.resetFields(); setIsModalVisible(true); }}>
                        Yeni İşlem
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey={(record) => record._id || record.transactionId || Math.random().toString()}
                    loading={loading}
                    size="middle"
                    pagination={{ pageSize: 10, size: 'small' }}
                />
            </Card>

            <Modal
                title={editingOdeme ? <b><EditOutlined /> Kasa İşlemini Düzenle</b> : <b><PlusOutlined /> Yeni Kasa İşlemi</b>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                width={550}
                centered
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 15 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="islemYonu" label="İşlem Yönü" rules={[{ required: true }]}>
                                <Select placeholder="Seçiniz" size="large">
                                    <Option value="Gelir">Tahsilat (Gelir)</Option>
                                    <Option value="Gider">Ödeme (Gider)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="tutar" label="Tutar (₺)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} size="large" precision={2} min={0.01} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="kategori" label="İşlem Kategorisi" rules={[{ required: true, message: 'Lütfen bir kategori seçin!' }]}>
                        <Select placeholder="Kategori Seçiniz" size="large">
                            <Option value="Fason Dikim">Fason Dikim</Option>
                            <Option value="Personel Maaş">Personel Maaş</Option>
                            <Option value="Kumaş/Malzeme">Kumaş/Malzeme</Option>
                            <Option value="Yol/Yemek">Yol/Yemek</Option>
                            <Option value="Kira/Fatura">Kira/Fatura</Option>
                            <Option value="Diğer">Diğer</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="relatedId" label="İlgili Cari (Müşteri / Personel)">
                        <Select showSearch placeholder="Cari Seçiniz (Opsiyonel)" size="large" allowClear optionFilterProp="children">
                            {cariler.map(c => <Option key={c._id} value={c._id}>{c.firmaAdi} ({c.kategori})</Option>)}
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="odemeTipi" label="Ödeme Şekli" initialValue="Nakit">
                                <Select size="large">
                                    <Option value="Nakit">Nakit</Option>
                                    <Option value="Banka">Banka / EFT</Option>
                                    <Option value="Kredi Kartı">Kredi Kartı</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="odemeTarihi" label="İşlem Tarihi" initialValue={dayjs()}>
                                <DatePicker style={{ width: '100%' }} size="large" format="DD.MM.YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notlar" label="Açıklama">
                        <Input.TextArea rows={2} placeholder="Fatura veya dekont açıklaması..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default KasaDefteri;