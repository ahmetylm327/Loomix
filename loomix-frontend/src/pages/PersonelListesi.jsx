import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Dropdown, Divider, Space, Row, Col, Statistic, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, CalculatorOutlined, MoreOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined, TeamOutlined, DollarOutlined, RollbackOutlined } from '@ant-design/icons';
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

    const [isRefundModalVisible, setIsRefundModalVisible] = useState(false);
    const [refundEmployee, setRefundEmployee] = useState(null);
    const [refundAmount, setRefundAmount] = useState(0);

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

    const handleRefund = async () => {
        if (!refundAmount || refundAmount <= 0) return message.warning("Lütfen geçerli bir tutar girin.");
        try {
            const id = refundEmployee.employeeId || refundEmployee._id;
            await axiosInstance.post(`/employees/${id}/refund`, { miktar: refundAmount });
            message.success(`${refundEmployee.adSoyad || refundEmployee.fullname} adlı personelden ${refundAmount} ₺ tahsil edildi!`);
            setIsRefundModalVisible(false);
            setRefundAmount(0);
            fetchData();
        } catch (error) {
            message.error("İade işlemi yapılamadı!");
        }
    };

    const handleTahakkukSubmit = async (values) => {
        setTahakkukLoading(true);
        try {
            const id = selectedPersonel.employeeId || selectedPersonel._id;
            await axiosInstance.post(`/payroll/${id}/calculate`, values);
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

    // 🚀 MİKRO MANTIĞI: Raporlar sayfasındaki aynı standart eklendi!
    const isBorc = (islemTipi) => islemTipi === 'Ödeme' || islemTipi === 'Avans';
    const isAlacak = (islemTipi) => islemTipi === 'Hakediş' || islemTipi === 'Avans İadesi' || islemTipi === 'Prim';

    const exportToExcel = () => {
        if (ekstreData.length === 0) return message.warning("Veri yok!");
        const excelData = ekstreData.map(item => ({
            "Tarih": dayjs(item.islemTarihi).format('DD.MM.YYYY HH:mm'),
            "Evrak Cinsi": item.islemTipi === 'Hakediş' ? 'Personel Tahakkuku' : (item.islemTipi === 'Ödeme' ? 'Kasa Tediye Fişi' : item.islemTipi),
            "Açıklama": item.aciklama || '-',
            "TL Borç": isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0,
            "TL Alacak": isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0,
            "Bakiye": item.bakiyeSonrasi || 0
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ekstre");
        XLSX.writeFile(workbook, `${ekstrePersonel?.adSoyad || ekstrePersonel?.fullname}_Ekstre.xlsx`);
    };

    const exportToPDF = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const doc = new jsPDF('p', 'pt', 'a4');
        const isim = ekstrePersonel?.adSoyad || ekstrePersonel?.fullname;

        doc.setFontSize(14);
        doc.text(`${isim} - Cari Hesap Ekstresi`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 40, 55);

        const tableColumn = ["Tarih", "Evrak Cinsi", "Aciklama", "Borc (TL)", "Alacak (TL)", "Bakiye"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.islemTarihi).format('DD.MM.YYYY'),
            item.islemTipi === 'Hakediş' ? 'Tahakkuk' : item.islemTipi,
            item.aciklama || '-',
            isBorc(item.islemTipi) ? Math.abs(item.tutar).toLocaleString('tr-TR') : '-',
            isAlacak(item.islemTipi) ? Math.abs(item.tutar).toLocaleString('tr-TR') : '-',
            Number(item.bakiyeSonrasi || 0).toLocaleString('tr-TR')
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 70, theme: 'grid', headStyles: { fillColor: [89, 89, 89] }, styles: { fontSize: 8 } });
        doc.save(`${isim}_Ekstre.pdf`);
    };

    // 🚀 YENİ: Raporlar sayfasındaki detaylı Ekstre tablosunun birebir aynısı!
    const ekstreColumns = [
        { title: 'Tarih', dataIndex: 'islemTarihi', width: 130, render: val => dayjs(val).format('DD.MM.YYYY HH:mm') },
        { title: 'Evrak Cinsi', dataIndex: 'islemTipi', width: 150, render: val => <b>{val === 'Hakediş' ? 'Personel Tahakkuku' : (val === 'Ödeme' ? 'Kasa Tediye Fişi' : val)}</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
        { title: 'TL Borç (Ödenen)', dataIndex: 'tutar', align: 'right', width: 120, render: (val, record) => isBorc(record.islemTipi) ? <Text type="danger">{Math.abs(val).toLocaleString('tr-TR')} ₺</Text> : '-' },
        { title: 'TL Alacak (Hakediş)', dataIndex: 'tutar', align: 'right', width: 120, render: (val, record) => isAlacak(record.islemTipi) ? <Text type="success">{Math.abs(val).toLocaleString('tr-TR')} ₺</Text> : '-' },
        { title: 'Yürüyen Bakiye', dataIndex: 'bakiyeSonrasi', align: 'right', width: 120, render: val => <b style={{ color: val < 0 ? '#3f8600' : (val > 0 ? '#cf1322' : '#000') }}>{Number(val || 0).toLocaleString('tr-TR')} ₺</b> },
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
            title: 'Cari Durum (Maliyet & Bakiye)',
            key: 'hesap',
            render: (_, record) => {
                const bakiye = record.bakiye || record.balance || 0;
                const ucret = record.ucretMiktari || record.daily_wage || 0;
                const tip = record.ucretTipi || (record.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük');
                const tipColor = tip === 'Saatlik' ? 'purple' : 'cyan';

                let bakiyeEtiket;
                if (bakiye > 0) {
                    bakiyeEtiket = <Tag color="error" style={{ fontSize: '13px', padding: '2px 8px' }}>Bizden Alacaklı: {bakiye} ₺</Tag>;
                } else if (bakiye < 0) {
                    bakiyeEtiket = <Tag color="success" style={{ fontSize: '13px', padding: '2px 8px' }}>Bize Borçlu: {Math.abs(bakiye)} ₺</Tag>;
                } else {
                    bakiyeEtiket = <Tag color="default" style={{ fontSize: '13px', padding: '2px 8px' }}>Bakiye Sıfır</Tag>;
                }

                return (
                    <div>
                        {bakiyeEtiket}<br />
                        <span style={{ fontSize: '12px', color: '#595959', marginTop: '4px', display: 'inline-block' }}>
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
                    { key: '2', label: 'Avans / Maaş Öde', icon: <WalletOutlined style={{ color: '#cf1322' }} />, onClick: () => { setPayEmployee(record); setPayAmount(0); setIsPayModalVisible(true); } },
                    { key: '6', label: 'Avans İadesi Al', icon: <RollbackOutlined style={{ color: '#52c41a' }} />, onClick: () => { setRefundEmployee(record); setRefundAmount(0); setIsRefundModalVisible(true); } },
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

    const toplamIceridekiPara = data.filter(d => d.bakiye > 0).reduce((acc, curr) => acc + (curr.bakiye || 0), 0);
    const saatlikCalisanSayisi = data.filter(d => d.ucretTipi === 'Saatlik' || d.wage_type === 'Hourly').length;
    const gunlukCalisanSayisi = data.length - saatlikCalisanSayisi;

    return (
        <div style={{ padding: '15px', background: '#f0f2f5', minHeight: '100vh' }}>

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
                        <Statistic title="Ödenecek Toplam Bakiye (Şirket Borcu)" value={toplamIceridekiPara} prefix={<DollarOutlined />} suffix="₺" styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }} />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Title level={4} style={{ margin: 0 }}>Personel Cari & Maliyet Yönetimi</Title>

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

            <Modal title={editingEmployee ? "Personel Güncelle" : "Yeni Personel Kaydı"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" destroyOnHidden>
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

            <Modal title={<><WalletOutlined style={{ color: '#cf1322' }} /> Personele Ödeme Yap</>} open={isPayModalVisible} onCancel={() => setIsPayModalVisible(false)} onOk={handlePayment} okText="Ödemeyi Tamamla" cancelText="Vazgeç" okButtonProps={{ danger: true }} destroyOnHidden>
                {payEmployee && (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        <Title level={4} style={{ marginBottom: 5 }}>{payEmployee.adSoyad || payEmployee.fullname}</Title>
                        <p style={{ color: '#8c8c8c' }}>İçerideki Alacağı: <b style={{ color: payEmployee.bakiye > 0 ? '#cf1322' : '#52c41a', fontSize: '16px' }}>{payEmployee.bakiye || 0} ₺</b></p>
                        <Alert message="DİKKAT: Bu işlem şirketin kasasından para çıkarır." type="error" showIcon style={{ marginBottom: 15, textAlign: 'left' }} />
                        <p style={{ marginBottom: 5 }}>Ödenecek Tutar (₺):</p>
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} value={payAmount} onChange={(value) => setPayAmount(value)} />
                    </div>
                )}
            </Modal>

            <Modal title={<><RollbackOutlined style={{ color: '#52c41a' }} /> Avans İadesi Al / Tahsilat</>} open={isRefundModalVisible} onCancel={() => setIsRefundModalVisible(false)} onOk={handleRefund} okText="Tahsilatı Kaydet" cancelText="Vazgeç" okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }} destroyOnHidden>
                {refundEmployee && (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        <Title level={4} style={{ marginBottom: 5 }}>{refundEmployee.adSoyad || refundEmployee.fullname}</Title>
                        <p style={{ color: '#8c8c8c' }}>Personele Olan Güncel Borcumuz: <b style={{ color: refundEmployee.bakiye > 0 ? '#cf1322' : '#52c41a', fontSize: '16px' }}>{refundEmployee.bakiye || 0} ₺</b></p>
                        <Alert message="Bu işlem çalışanın şirkete nakit para getirdiğini varsayar. Kasaya GELİR olarak yansır." type="success" showIcon style={{ marginBottom: 15, textAlign: 'left' }} />
                        <p style={{ marginBottom: 5 }}>Alınan İade Tutarı (₺):</p>
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} value={refundAmount} onChange={(value) => setRefundAmount(value)} />
                    </div>
                )}
            </Modal>

            <Modal title={selectedPersonel ? `${selectedPersonel.adSoyad || selectedPersonel.fullname} - Manuel Tahakkuk` : "Tahakkuk İşlemi"} open={isTahakkukModalVisible} onCancel={() => setIsTahakkukModalVisible(false)} footer={null} destroyOnHidden>
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 5 }}>
                    <p style={{ margin: 0 }}><b>Kayıtlı {selectedPersonel?.ucretTipi} Ücreti:</b> {selectedPersonel?.ucretMiktari || selectedPersonel?.daily_wage} ₺</p>
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

            {/* 🚀 YENİ: Raporlar sayfasındaki Ekstrenin BİREBİR AYNISI */}
            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30 }}>
                        <span>{ekstrePersonel?.adSoyad || ekstrePersonel?.fullname} - Detaylı Hesap Ekstresi</span>
                        <Space>
                            <Button size="small" icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} onClick={exportToExcel}>Excel</Button>
                            <Button size="small" type="primary" danger icon={<FilePdfOutlined />} onClick={exportToPDF}>PDF</Button>
                        </Space>
                    </div>
                }
                open={isEkstreVisible}
                onCancel={() => setIsEkstreVisible(false)}
                footer={null}
                width={900}
                destroyOnHidden
            >
                <Table
                    columns={ekstreColumns}
                    dataSource={ekstreData}
                    rowKey="_id"
                    loading={ekstreLoading}
                    pagination={{ pageSize: 12 }}
                    size="small"
                    bordered
                    style={{ marginTop: 15 }}
                    summary={() => {
                        let totalBorc = 0;
                        let totalAlacak = 0;

                        ekstreData.forEach(({ islemTipi, tutar }) => {
                            if (isBorc(islemTipi)) totalBorc += Math.abs(tutar);
                            if (isAlacak(islemTipi)) totalAlacak += Math.abs(tutar);
                        });

                        const netBakiye = totalAlacak - totalBorc;

                        return (
                            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold', fontSize: '14px' }}>
                                <Table.Summary.Cell index={0} colSpan={3} align="right">
                                    GENEL TOPLAM:
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text type="danger">{totalBorc.toLocaleString('tr-TR')} ₺</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right">
                                    <Text type="success">{totalAlacak.toLocaleString('tr-TR')} ₺</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right">
                                    <span style={{ color: netBakiye > 0 ? '#cf1322' : (netBakiye < 0 ? '#3f8600' : '#000') }}>
                                        {netBakiye.toLocaleString('tr-TR')} ₺
                                    </span>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Modal>
        </div>
    );
};

export default PersonelListesi;