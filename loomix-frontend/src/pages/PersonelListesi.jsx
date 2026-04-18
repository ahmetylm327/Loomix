import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Dropdown, Divider, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, CalculatorOutlined, MoreOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
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

    // --- MEVCUT STATELER ---
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

    // --- YENİ STATELER (Toplu Ödeme ve Ekstre) ---
    const [selectedRowKeys, setSelectedRowKeys] = useState([]); // Checkbox seçimleri için
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

    // ... (Mevcut handleSave ve handleDelete fonksiyonların aynı kalıyor)
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

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Emin misiniz?',
            content: 'Bu personel kaydını silmek istediğinize emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() { handleDelete(id); },
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
        if (!payAmount || payAmount <= 0) return message.warning("Lütfen geçerli bir tutar girin.");
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

    const showTahakkukModal = (personel) => {
        setSelectedPersonel(personel);
        setIsTahakkukModalVisible(true);
        tahakkukForm.setFieldsValue({
            period_type: 'Haftalık',
            calisilanGunManuel: 6,
            calculation_date: dayjs().format('YYYY-MM-DD')
        });
    };

    // 🚀 YENİ: Toplu Ödeme İşlemi
    const handleBulkPayment = () => {
        confirm({
            title: `${selectedRowKeys.length} Personele Toplu Ödeme`,
            icon: <WalletOutlined style={{ color: '#52c41a' }} />,
            content: 'Seçili personellerin içerideki TÜM bakiyeleri sıfırlanıp ödendi olarak işaretlenecek. Onaylıyor musunuz?',
            okText: 'Evet, Hepsini Öde',
            okType: 'primary',
            cancelText: 'Vazgeç',
            async onOk() {
                try {
                    const res = await axiosInstance.post('/employees/bulk-pay', { personelIds: selectedRowKeys });
                    message.success(`Toplam ${res.data.odenen} ₺ başarıyla ödendi!`);
                    setSelectedRowKeys([]); // Seçimleri temizle
                    fetchData(); // Tabloyu yenile
                } catch (error) {
                    message.error(error.response?.data?.mesaj || "Toplu ödeme başarısız!");
                }
            }
        });
    };

    // 🚀 YENİ: Ekstre Getirme
    const fetchEkstre = async (personel) => {
        const id = personel.employeeId || personel._id;
        setEkstrePersonel(personel);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const res = await axiosInstance.get(`/employees/${id}/ekstre`);
            setEkstreData(res.data);
        } catch (error) {
            message.error("Ekstre verileri alınamadı!");
        } finally {
            setEkstreLoading(false);
        }
    };

    // 🖨️ YENİ: Excel'e Aktar
    const exportToExcel = () => {
        if (ekstreData.length === 0) return message.warning("Dışa aktarılacak veri yok!");
        const formattedData = ekstreData.map(item => ({
            'Tarih': dayjs(item.islemTarihi).format('DD.MM.YYYY HH:mm'),
            'İşlem Tipi': item.islemTipi,
            'Açıklama': item.aciklama || '-',
            'Tutar (₺)': item.tutar,
            'Kalan Bakiye (₺)': item.bakiyeSonrasi || '-'
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hesap Ekstresi");
        XLSX.writeFile(workbook, `${ekstrePersonel.adSoyad || ekstrePersonel.fullname}_Ekstre.xlsx`);
    };

    // 🖨️ YENİ: PDF'e Aktar
    const exportToPDF = () => {
        if (ekstreData.length === 0) return message.warning("Dışa aktarılacak veri yok!");
        const doc = new jsPDF();
        const isim = ekstrePersonel.adSoyad || ekstrePersonel.fullname;

        doc.setFontSize(18);
        doc.text("LOOMIX ERP - Personel Hesap Ekstresi", 14, 22);
        doc.setFontSize(12);
        doc.text(`Personel: ${isim}`, 14, 32);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 14, 40);

        const tableColumn = ["Tarih", "İslem Tipi", "Aciklama", "Tutar (TL)", "Bakiye (TL)"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.islemTarihi).format('DD.MM.YYYY'),
            item.islemTipi,
            item.aciklama || '-',
            item.tutar.toString(),
            (item.bakiyeSonrasi || 0).toString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [29, 53, 87] }
        });

        doc.save(`${isim}_Ekstre.pdf`);
    };

    // YENİ: Ekstre Tablosu Sütunları
    const ekstreColumns = [
        { title: 'Tarih', dataIndex: 'islemTarihi', render: (val) => dayjs(val).format('DD.MM.YYYY') },
        { title: 'İşlem', dataIndex: 'islemTipi', render: (val) => <Tag color={val === 'Ödeme' ? 'red' : 'green'}>{val}</Tag> },
        { title: 'Tutar', dataIndex: 'tutar', render: (val) => <b style={{ color: val < 0 ? '#cf1322' : '#3f8600' }}>{val} ₺</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
    ];

    // Checkbox Seçim Ayarları
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
    };

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
            title: '',
            key: 'actions',
            align: 'right',
            width: 50,
            render: (_, record) => {
                const items = [
                    { key: '1', label: 'Tahakkuk Et', icon: <CalculatorOutlined style={{ color: '#1890ff' }} />, onClick: () => showTahakkukModal(record) },
                    { key: '2', label: 'Avans/Maaş Öde', icon: <WalletOutlined style={{ color: '#52c41a' }} />, onClick: () => { setPayEmployee(record); setPayAmount(0); setIsPayModalVisible(true); } },
                    { key: '5', label: 'Hesap Ekstresi', icon: <FileTextOutlined style={{ color: '#fa8c16' }} />, onClick: () => fetchEkstre(record) }, // YENİ EKLENDİ
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

                    <Space>
                        {/* Seçili personel varsa Toplu Ödeme Butonu görünür */}
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
                    rowSelection={rowSelection} // Checkboxlar aktif
                    columns={columns}
                    dataSource={data}
                    rowKey={(record) => record.employeeId || record._id}
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

            {/* --- MEVCUT MODALLAR (Personel Ekle, Tahakkuk, Manuel Ödeme) BURADA --- */}
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
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} value={payAmount} onChange={(value) => setPayAmount(value)} />
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
                        </Select>
                    </Form.Item>
                    <Form.Item name="calisilanGunManuel" label="Çalışılan Gün"><InputNumber style={{ width: '100%' }} size="large" min={0.5} max={31} step={0.5} /></Form.Item>
                    <Form.Item name="calculation_date" hidden><Input /></Form.Item>
                    <Button type="primary" htmlType="submit" loading={tahakkukLoading} block size="large" style={{ marginTop: 10 }}>Tahakkuk Fişini Kaydet</Button>
                </Form>
            </Modal>

            {/* 🚀 YENİ: HESAP EKSTRESİ MODALI */}
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

                <Table
                    columns={ekstreColumns}
                    dataSource={ekstreData}
                    rowKey="_id"
                    loading={ekstreLoading}
                    pagination={{ pageSize: 8 }}
                    size="small"
                />
            </Modal>

        </div>
    );
};

export default PersonelListesi;