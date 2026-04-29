import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Dropdown, Divider, Space, Row, Col, Statistic, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, CalculatorOutlined, MoreOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined, TeamOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;
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

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState([]);
    const [ekstrePersonel, setEkstrePersonel] = useState(null);
    const [ekstreLoading, setEkstreLoading] = useState(false);

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
                adSoyad: values.adSoyad,
                ucretTipi: values.ucretTipi,
                ucretMiktari: values.ucretMiktari,
                pozisyon: values.pozisyon,
                telefon: values.telefon
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

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Emin misiniz?',
            content: 'Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() { handleDelete(id); },
        });
    };

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/employees/${id}`);
            message.success("Personel silindi.");
            fetchData();
        } catch (error) {
            message.error("Silme işlemi başarısız!");
        }
    };

    const showEditModal = (record) => {
        setEditingEmployee(record);
        form.setFieldsValue({
            adSoyad: record.adSoyad || record.fullname,
            pozisyon: record.pozisyon || record.position,
            ucretTipi: record.ucretTipi || (record.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük'),
            ucretMiktari: record.ucretMiktari || record.daily_wage,
            telefon: record.telefon || record.phoneNumber
        });
        setIsModalVisible(true);
    };

    const handlePayment = async () => {
        if (!payAmount || payAmount <= 0) return message.warning("Lütfen geçerli bir tutar girin.");
        try {
            const id = payEmployee.employeeId || payEmployee._id;
            await axiosInstance.post(`/employees/${id}/pay`, { miktar: payAmount });
            message.success(`${payEmployee.adSoyad || payEmployee.fullname} adlı personele ${payAmount} ₺ ödendi!`);
            setIsPayModalVisible(false);
            setPayAmount(0);
            fetchData();
        } catch (error) {
            message.error("Ödeme yapılamadı!");
        }
    };

    const handleTahakkukSubmit = async (values) => {
        setTahakkukLoading(true);
        try {
            const id = selectedPersonel.employeeId || selectedPersonel._id;
            const res = await axiosInstance.post(`/payroll/${id}/calculate`, values);
            message.success(`Tahakkuk başarıyla eklendi!`);
            setIsTahakkukModalVisible(false);
            tahakkukForm.resetFields();
            fetchData();
        } catch (error) {
            message.error("Tahakkuk başarısız oldu.");
        } finally {
            setTahakkukLoading(false);
        }
    };

    const showTahakkukModal = (personel) => {
        setSelectedPersonel(personel);
        setIsTahakkukModalVisible(true);
        tahakkukForm.setFieldsValue({
            period_type: 'Haftalık',
            calisilanGunManuel: 6
        });
    };

    const handleBulkPayment = () => {
        confirm({
            title: `${selectedRowKeys.length} Personele Toplu Ödeme`,
            icon: <WalletOutlined style={{ color: '#52c41a' }} />,
            content: 'Seçili personellerin içerideki TÜM bakiyeleri sıfırlanıp "Ödendi" olarak işaretlenecek. Onaylıyor musunuz?',
            okText: 'Evet, Hepsini Öde',
            okType: 'primary',
            cancelText: 'Vazgeç',
            async onOk() {
                try {
                    const res = await axiosInstance.post('/employees/bulk-pay', { personelIds: selectedRowKeys });
                    message.success(`Toplam ${res.data.odenen} ₺ başarıyla ödendi!`);
                    setSelectedRowKeys([]);
                    fetchData();
                } catch (error) {
                    message.error(error.response?.data?.mesaj || "Toplu ödeme başarısız!");
                }
            }
        });
    };

    const fetchEkstre = async (personel) => {
        const id = personel.employeeId || personel._id;
        setEkstrePersonel(personel);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const res = await axiosInstance.get(`/employees/${id}/ekstre`);
            setEkstreData(res.data);
        } catch (error) {
            message.error("Ekstre alınamadı!");
        } finally {
            setEkstreLoading(false);
        }
    };

    const exportToExcel = () => {
        if (ekstreData.length === 0) return message.warning("Veri yok!");
        const formattedData = ekstreData.map(item => ({
            'Tarih': dayjs(item.islemTarihi).format('DD.MM.YYYY HH:mm'),
            'İşlem Tipi': item.islemTipi,
            'Açıklama': item.aciklama || '-',
            'Tutar (₺)': item.tutar,
            'Kalan Bakiye (₺)': item.bakiyeSonrasi || '-'
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ekstre");
        XLSX.writeFile(workbook, `${ekstrePersonel.adSoyad || ekstrePersonel.fullname}_Ekstre.xlsx`);
    };

    const exportToPDF = () => {
        if (ekstreData.length === 0) return message.warning("Veri yok!");
        const doc = new jsPDF();
        const isim = ekstrePersonel.adSoyad || ekstrePersonel.fullname;

        doc.setFontSize(18);
        doc.text("LOOMIX ERP - Personel Ekstresi", 14, 22);
        doc.setFontSize(12);
        doc.text(`Personel: ${isim}`, 14, 32);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 14, 40);

        const tableColumn = ["Tarih", "Islem Tipi", "Aciklama", "Tutar (TL)", "Bakiye (TL)"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.islemTarihi).format('DD.MM.YYYY'),
            item.islemTipi,
            item.aciklama || '-',
            item.tutar.toString(),
            (item.bakiyeSonrasi || 0).toString()
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 50, theme: 'striped', headStyles: { fillColor: [29, 53, 87] } });
        doc.save(`${isim}_Ekstre.pdf`);
    };

    const ekstreColumns = [
        { title: 'Tarih', dataIndex: 'islemTarihi', render: (val) => dayjs(val).format('DD.MM.YYYY') },
        { title: 'İşlem', dataIndex: 'islemTipi', render: (val) => <Tag color={val === 'Ödeme' ? 'red' : 'green'}>{val}</Tag> },
        { title: 'Tutar', dataIndex: 'tutar', render: (val) => <b style={{ color: val < 0 ? '#cf1322' : '#3f8600' }}>{val} ₺</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
    ];

    const columns = [
        {
            title: 'Personel Bilgisi',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px' }}>{record.adSoyad || record.fullname}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.pozisyon || record.position}</span>
                </div>
            )
        },
        {
            title: 'Maliyet & Bakiye',
            key: 'hesap',
            render: (_, record) => {
                const bakiye = record.bakiye || record.balance || 0;
                const ucret = record.ucretMiktari || record.daily_wage || 0;
                const tip = record.ucretTipi || (record.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük');
                const tipColor = tip === 'Saatlik' ? 'purple' : 'cyan';

                return (
                    <div>
                        <Tag color={bakiye > 0 ? "error" : "success"} style={{ fontSize: '13px', padding: '2px 8px', marginBottom: '4px' }}>
                            İçerideki: {bakiye} ₺
                        </Tag><br />
                        <span style={{ fontSize: '12px', color: '#595959' }}>
                            <Tag color={tipColor} bordered={false} style={{ fontSize: '10px', padding: '0 4px', marginRight: 4 }}>{tip}</Tag>
                            {ucret} ₺
                        </span>
                    </div>
                )
            }
        },
        {
            title: '',
            key: 'actions',
            align: 'right',
            width: 50,
            render: (_, record) => {
                const items = [
                    { key: '1', label: 'Manuel Tahakkuk', icon: <CalculatorOutlined style={{ color: '#1890ff' }} />, onClick: () => showTahakkukModal(record) },
                    { key: '2', label: 'Avans/Maaş Öde', icon: <WalletOutlined style={{ color: '#52c41a' }} />, onClick: () => { setPayEmployee(record); setPayAmount(0); setIsPayModalVisible(true); } },
                    { key: '5', label: 'Hesap Ekstresi', icon: <FileTextOutlined style={{ color: '#fa8c16' }} />, onClick: () => fetchEkstre(record) },
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

    // İstatistik Hesaplamaları (Dashboard için)
    const toplamIceridekiPara = data.reduce((acc, curr) => acc + (curr.bakiye || 0), 0);
    const saatlikCalisanSayisi = data.filter(d => d.ucretTipi === 'Saatlik' || d.wage_type === 'Hourly').length;
    const gunlukCalisanSayisi = data.length - saatlikCalisanSayisi;

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh' }}>

            {/* 🚀 YENİ: FİNANSAL DASHBOARD KARTLARI */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #1890ff' }}>
                        <Statistic title="Aktif Personel" value={data.length} prefix={<TeamOutlined />} />
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 8 }}>
                            <Tag color="purple">{saatlikCalisanSayisi} Saatlik</Tag>
                            <Tag color="cyan">{gunlukCalisanSayisi} Günlük</Tag>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #cf1322' }}>
                        <Statistic title="Ödenecek Toplam Bakiye (Borç)" value={toplamIceridekiPara} prefix={<DollarOutlined />} suffix="₺" styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }} />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Title level={4} style={{ margin: 0 }}>Personel & Maliyet Yönetimi</Title>

                    <Space>
                        {selectedRowKeys.length > 0 && (
                            <Button type="primary" danger icon={<CheckCircleOutlined />} onClick={handleBulkPayment} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                                {selectedRowKeys.length} Kişiye Öde
                            </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                            setEditingEmployee(null);
                            form.resetFields();
                            setIsModalVisible(true);
                        }}>
                            Yeni Ekle
                        </Button>
                    </Space>
                </div>

                <Table
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    columns={columns}
                    dataSource={data}
                    rowKey={(record) => record.employeeId || record._id}
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

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
                    <Form.Item name="adSoyad" label="Ad Soyad" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="pozisyon" label="Görev / Pozisyon" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="ucretTipi" label="Ücret Hesaplama Tipi" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Saatlik">Saatlik (Giriş-Çıkış saatine göre)</Select.Option>
                            <Select.Option value="Günlük">Günlük (Sabit yevmiye)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="ucretMiktari" label="Birim Ücreti (₺)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} size="large" /></Form.Item>
                    <Form.Item name="telefon" label="Telefon"><Input /></Form.Item>
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
                        <Title level={4} style={{ marginBottom: 5 }}>{payEmployee.adSoyad || payEmployee.fullname}</Title>
                        <p style={{ color: '#8c8c8c' }}>İçerideki Alacağı: <b style={{ color: '#cf1322', fontSize: '16px' }}>{payEmployee.bakiye || payEmployee.balance || 0} ₺</b></p>
                        <Divider style={{ margin: '15px 0' }} />
                        <p style={{ marginBottom: 5 }}>Ödenecek Tutar (₺):</p>
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} value={payAmount} onChange={(value) => setPayAmount(value)} />
                    </div>
                )}
            </Modal>

            <Modal
                title={selectedPersonel ? `${selectedPersonel.adSoyad || selectedPersonel.fullname} - Manuel Tahakkuk` : "Tahakkuk İşlemi"}
                open={isTahakkukModalVisible}
                onCancel={() => setIsTahakkukModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 5 }}>
                    <p style={{ margin: 0 }}>
                        <b>Kayıtlı {selectedPersonel?.ucretTipi} Ücreti:</b> {selectedPersonel?.ucretMiktari || selectedPersonel?.daily_wage} ₺
                    </p>
                    <p style={{ margin: 0, color: '#cf1322' }}><b>Mevcut Alacak:</b> {selectedPersonel?.bakiye || selectedPersonel?.balance || 0} ₺</p>
                </div>
                <Form form={tahakkukForm} layout="vertical" onFinish={handleTahakkukSubmit}>
                    <Alert message="Puantaj sistemini kullanmanız önerilir. Bu ekran sadece manuel düzeltmeler içindir." type="info" showIcon style={{ marginBottom: 15 }} />
                    <Form.Item name="period_type" label="Hesaplama Periyodu" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Haftalık">Haftalık (6 Gün)</Select.Option>
                            <Select.Option value="Aylık">Aylık (26 Gün)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="calisilanGunManuel" label="Çalışılan Gün/Saat Miktarı"><InputNumber style={{ width: '100%' }} size="large" min={0.5} step={0.5} /></Form.Item>
                    <Button type="primary" htmlType="submit" loading={tahakkukLoading} block size="large" style={{ marginTop: 10 }}>Tahakkuk Fişini Kaydet</Button>
                </Form>
            </Modal>

            <Modal
                title={`${ekstrePersonel?.adSoyad || ekstrePersonel?.fullname} - Hesap Ekstresi`}
                open={isEkstreVisible}
                onCancel={() => setIsEkstreVisible(false)}
                footer={null}
                width={700}
                destroyOnHidden
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
                    <Button icon={<FileExcelOutlined />} onClick={exportToExcel} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Excel İndir</Button>
                    <Button type="primary" danger icon={<FilePdfOutlined />} onClick={exportToPDF}>PDF İndir</Button>
                </div>

                <Table columns={ekstreColumns} dataSource={ekstreData} rowKey="_id" loading={ekstreLoading} pagination={{ pageSize: 8 }} size="small" />
            </Modal>
        </div>
    );
};

export default PersonelListesi;