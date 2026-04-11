import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Dropdown, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, CalculatorOutlined, MoreOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';

const { Title } = Typography;
const { confirm } = Modal;

const PersonelListesi = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [form] = Form.useForm();

    const [isPayModalVisible, setIsPayModalVisible] = useState(false);
    const [payEmployee, setPayEmployee] = useState(null);
    const [payAmount, setPayAmount] = useState(0);

    const [isTahakkukModalVisible, setIsTahakkukModalVisible] = useState(false);
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [tahakkukForm] = Form.useForm();
    const [tahakkukLoading, setTahakkukLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/employees');
            setData(response.data);
        } catch (error) {
            message.error("Veriler çekilemedi!");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values) => {
        try {
            const backendData = {
                fullname: values.fullname,
                wage_type: values.wage_type === "Günlük" ? "Daily" : "Hourly",
                daily_wage: values.wage_amount,
                position: values.position,
                phoneNumber: values.phoneNumber,
                mikro_id: values.mikro_id || null
            };

            if (editingEmployee) {
                const id = editingEmployee.employeeId || editingEmployee._id;
                await axiosInstance.put(`/employees/${id}`, backendData);
                message.success("Personel güncellendi!");
            } else {
                await axiosInstance.post('/employees', backendData);
                message.success("Personel başarıyla eklendi!");
            }

            setIsModalVisible(false);
            setEditingEmployee(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error("İşlem başarısız!");
        }
    };

    // YENİ: Mobilde açılır menüden silme işlemi için özel onay penceresi
    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Emin misiniz?',
            content: 'Bu personel kaydını silmek istediğinize emin misiniz?',
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
            await axiosInstance.delete(`/employees/${id}`);
            message.success("Personel kaydı silindi.");
            fetchData();
        } catch (error) {
            message.error("Silme işlemi başarısız!");
        }
    };

    const showEditModal = (record) => {
        setEditingEmployee(record);
        form.setFieldsValue({
            fullname: record.fullname || record.adSoyad,
            position: record.position || record.pozisyon,
            wage_amount: record.daily_wage || record.ucretMiktari,
            wage_type: "Günlük",
            phoneNumber: record.phoneNumber || record.telefon
        });
        setIsModalVisible(true);
    };

    const handlePayment = async () => {
        if (!payAmount || payAmount <= 0) {
            return message.warning("Lütfen geçerli bir tutar girin.");
        }
        try {
            const id = payEmployee.employeeId || payEmployee._id;
            await axiosInstance.post(`/employees/${id}/pay`, { miktar: payAmount });
            message.success(`${payEmployee.fullname || payEmployee.adSoyad} adlı personele ${payAmount} ₺ ödendi!`);
            setIsPayModalVisible(false);
            setPayAmount(0);
            fetchData();
        } catch (error) {
            message.error("Ödeme yapılamadı!");
        }
    };

    const showTahakkukModal = (personel) => {
        setSelectedPersonel(personel);
        setIsTahakkukModalVisible(true);
        tahakkukForm.setFieldsValue({
            period_type: 'Haftalık',
            calisilanGunManuel: 6,
            calculation_date: dayjs().format('YYYY-MM-DD')
        });
    };

    const handleTahakkukSubmit = async (values) => {
        setTahakkukLoading(true);
        try {
            const id = selectedPersonel.employeeId || selectedPersonel._id;
            const res = await axiosInstance.post(`/payroll/${id}/calculate`, values);
            message.success(`${res.data.fullname} için ${res.data.total_earnings} TL tahakkuk edildi!`);
            setIsTahakkukModalVisible(false);
            tahakkukForm.resetFields();
            fetchData();
        } catch (error) {
            message.error("Tahakkuk işlemi başarısız oldu.");
        } finally {
            setTahakkukLoading(false);
        }
    };

    // YENİ: Mobilde kusursuz görünen 3 kolonlu yapı
    const columns = [
        {
            title: 'Personel Bilgisi',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px' }}>{record.fullname || record.adSoyad}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.position || record.pozisyon}</span>
                </div>
            )
        },
        {
            title: 'Hesap Durumu',
            key: 'hesap',
            render: (_, record) => {
                const bakiye = record.balance || record.bakiye || 0;
                const yevmiye = record.daily_wage || record.ucretMiktari || 0;
                return (
                    <div>
                        <Tag color={bakiye > 0 ? "error" : "success"} style={{ fontSize: '13px', padding: '2px 8px' }}>{bakiye} ₺</Tag><br />
                        <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Yevmiye: {yevmiye} ₺</span>
                    </div>
                )
            }
        },
        {
            title: '', // Başlıksız dar sütun
            key: 'actions',
            align: 'right',
            width: 50,
            render: (_, record) => {
                // Üç noktaya tıklayınca açılacak menü
                const items = [
                    { key: '1', label: 'Tahakkuk Et', icon: <CalculatorOutlined style={{ color: '#1890ff' }} />, onClick: () => showTahakkukModal(record) },
                    { key: '2', label: 'Avans/Maaş Öde', icon: <WalletOutlined style={{ color: '#52c41a' }} />, onClick: () => { setPayEmployee(record); setPayAmount(0); setIsPayModalVisible(true); } },
                    { type: 'divider' },
                    { key: '3', label: 'Düzenle', icon: <EditOutlined />, onClick: () => showEditModal(record) },
                    { key: '4', label: 'Sil', icon: <DeleteOutlined />, danger: true, onClick: () => showDeleteConfirm(record.employeeId || record._id) },
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
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Title level={4} style={{ margin: 0 }}>Personel Yönetimi</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingEmployee(null);
                        form.resetFields();
                        setIsModalVisible(true);
                    }}>
                        Yeni Ekle
                    </Button>
                </div>

                {/* YENİ: scroll özelliğini kaldırdık, çünkü artık 3 kolon ekrana tam sığıyor */}
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey={(record) => record.employeeId || record._id}
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

            {/* MODALLAR AYNEN KORUNDU */}
            <Modal
                title={editingEmployee ? "Personel Güncelle" : "Yeni Personel Kaydı"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                okText="Kaydet"
                cancelText="Vazgeç"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 15 }}>
                    <Form.Item name="fullname" label="Ad Soyad" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="position" label="Pozisyon" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="wage_type" label="Ücret Tipi" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Günlük">Günlük</Select.Option>
                            <Select.Option value="Saatlik">Saatlik</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="wage_amount" label="Ücret Miktarı" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="phoneNumber" label="Telefon"><Input /></Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<><WalletOutlined style={{ color: '#52c41a' }} /> Avans / Maaş Ödemesi</>}
                open={isPayModalVisible}
                onCancel={() => setIsPayModalVisible(false)}
                onOk={handlePayment}
                okText="Ödemeyi Tamamla"
                cancelText="Vazgeç"
                okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
                destroyOnHidden
            >
                {payEmployee && (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        <Title level={4} style={{ marginBottom: 5 }}>{payEmployee.fullname || payEmployee.adSoyad}</Title>
                        <p style={{ color: '#8c8c8c' }}>İçerideki Alacağı: <b style={{ color: '#cf1322', fontSize: '16px' }}>{payEmployee.balance || payEmployee.bakiye || 0} ₺</b></p>
                        <Divider style={{ margin: '15px 0' }} />
                        <p style={{ marginBottom: 5 }}>Ödenecek Tutar (₺):</p>
                        <InputNumber
                            style={{ width: '100%', maxWidth: '250px' }}
                            size="large"
                            min={0}
                            value={payAmount}
                            onChange={(value) => setPayAmount(value)}
                        />
                    </div>
                )}
            </Modal>

            <Modal
                title={selectedPersonel ? `${selectedPersonel.fullname || selectedPersonel.adSoyad} - Tahakkuk` : "Tahakkuk İşlemi"}
                open={isTahakkukModalVisible}
                onCancel={() => setIsTahakkukModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 5 }}>
                    <p style={{ margin: 0 }}><b>Günlük Yevmiye:</b> {selectedPersonel?.daily_wage || selectedPersonel?.ucretMiktari} ₺</p>
                    <p style={{ margin: 0, color: '#cf1322' }}><b>Mevcut Alacak:</b> {selectedPersonel?.balance || selectedPersonel?.bakiye || 0} ₺</p>
                </div>

                <Form form={tahakkukForm} layout="vertical" onFinish={handleTahakkukSubmit}>
                    <Form.Item name="period_type" label="Hesaplama Periyodu" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Haftalık">Haftalık (6 Gün)</Select.Option>
                            <Select.Option value="Aylık">Aylık (26 Gün)</Select.Option>
                            <Select.Option value="Günlük">Günlük (Serbest Giriş)</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="calisilanGunManuel"
                        label="Çalışılan Gün"
                    >
                        <InputNumber style={{ width: '100%' }} size="large" min={0.5} max={31} step={0.5} />
                    </Form.Item>

                    <Form.Item name="calculation_date" hidden>
                        <Input />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={tahakkukLoading} block size="large" style={{ marginTop: 10 }}>
                        Tahakkuk Fişini Kaydet
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default PersonelListesi;