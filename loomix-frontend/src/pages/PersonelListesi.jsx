import React, { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, message, Button, Modal, Form, Input, Select, InputNumber, Dropdown, Space, Row, Col, Statistic, Alert, Popconfirm } from 'antd';
// 🚀 ToolOutlined ikonu import edildi
import { PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined, CalculatorOutlined, MoreOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined, TeamOutlined, DollarOutlined, RollbackOutlined, HistoryOutlined, ToolOutlined } from '@ant-design/icons';
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

    const [isPuantajArsivVisible, setIsPuantajArsivVisible] = useState(false);
    const [puantajArsivData, setPuantajArsivData] = useState([]);
    const [puantajArsivLoading, setPuantajArsivLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    };

    const getBakiye = (record) => (record?.bakiye ?? record?.balance ?? 0);
    const getAdSoyad = (record) => record?.adSoyad || record?.fullname || '';
    const getId = (record) => record?.employeeId || record?._id;

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
                telefon: values.telefon,
                mikroId: values.mikroId
            };

            if (editingEmployee) {
                const id = getId(editingEmployee);
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
            adSoyad: getAdSoyad(record),
            pozisyon: record.pozisyon || record.position,
            ucretTipi: record.ucretTipi || (record.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük'),
            ucretMiktari: record.ucretMiktari || record.daily_wage,
            telefon: record.telefon || record.phoneNumber,
            mikroId: record.mikroId
        });
        setIsModalVisible(true);
    };

    const handlePayment = async () => {
        if (!payAmount || payAmount <= 0) return message.warning("Lütfen geçerli bir tutar girin.");

        const mevcutBakiye = getBakiye(payEmployee);
        if (mevcutBakiye > 0 && payAmount > mevcutBakiye) {
            return message.warning(
                `Ödeme tutarı (${formatMoney(payAmount)} ₺), personelin alacağından (${formatMoney(mevcutBakiye)} ₺) fazla olamaz.`
            );
        }

        try {
            const id = getId(payEmployee);
            await axiosInstance.post(`/employees/${id}/pay`, { miktar: payAmount });
            message.success(`${getAdSoyad(payEmployee)} adlı personele ${formatMoney(payAmount)} ₺ ödendi!`);
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
            const id = getId(refundEmployee);
            await axiosInstance.post(`/employees/${id}/refund`, { miktar: refundAmount });
            message.success(`${getAdSoyad(refundEmployee)} adlı personelden ${formatMoney(refundAmount)} ₺ tahsil edildi!`);
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
            const id = getId(selectedPersonel);
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
        const gecerliPersoneller = data.filter(
            (d) => selectedRowKeys.includes(getId(d)) && getBakiye(d) > 0
        );
        const gecersizSayisi = selectedRowKeys.length - gecerliPersoneller.length;

        if (gecerliPersoneller.length === 0) {
            return message.warning("Seçili personellerin hiçbirinde ödenecek (pozitif) bakiye yok.");
        }

        const gecerliIdler = gecerliPersoneller.map(getId);
        const toplamTutar = gecerliPersoneller.reduce((acc, curr) => acc + getBakiye(curr), 0);

        confirm({
            title: `${gecerliPersoneller.length} Personele Toplu Ödeme`,
            icon: <WalletOutlined style={{ color: '#52c41a' }} />,
            content: (
                <div>
                    <p>
                        Seçili <b>{gecerliPersoneller.length}</b> personelin toplam{' '}
                        <b>{formatMoney(toplamTutar)} ₺</b> bakiyesi sıfırlanıp
                        "Ödendi" olarak işaretlenecek. Onaylıyor musunuz?
                    </p>
                    {gecersizSayisi > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            message={`${gecersizSayisi} personel, bakiyesi sıfır veya negatif (şirkete borçlu) olduğu için işlem dışında bırakıldı.`}
                            style={{ marginTop: 8 }}
                        />
                    )}
                </div>
            ),
            okText: 'Evet, Hepsini Öde',
            okType: 'primary',
            cancelText: 'Vazgeç',
            async onOk() {
                try {
                    const res = await axiosInstance.post('/employees/bulk-pay', { personelIds: gecerliIdler });
                    message.success(`Toplam ${formatMoney(res.data.odenen)} ₺ başarıyla ödendi!`);
                    setSelectedRowKeys([]);
                    fetchData();
                } catch (error) {
                    message.error(error.response?.data?.mesaj || "Toplu ödeme başarısız!");
                }
            }
        });
    };

    const fetchEkstre = async (personel) => {
        const id = getId(personel);
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

    const handleEkstreSil = async (hareketId) => {
        try {
            const id = getId(ekstrePersonel);
            await axiosInstance.delete(`/employees/${id}/ekstre/${hareketId}`);
            message.success(`Kayıt silindi ve bakiye düzeltildi!`);
            fetchEkstre(ekstrePersonel);
            fetchData();
        } catch (error) {
            message.error("Kayıt silinemedi!");
        }
    };

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
        XLSX.writeFile(workbook, `${getAdSoyad(ekstrePersonel)}_Ekstre.xlsx`);
    };

    const exportToPDF = () => {
        if (!ekstreData || ekstreData.length === 0) return message.warning("Veri yok!");
        const doc = new jsPDF('p', 'pt', 'a4');
        const isim = getAdSoyad(ekstrePersonel);

        doc.setFontSize(14);
        doc.text(`${isim} - Cari Hesap Ekstresi`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY')}`, 40, 55);

        const tableColumn = ["Tarih", "Evrak Cinsi", "Aciklama", "Borc (TL)", "Alacak (TL)", "Bakiye"];
        const tableRows = ekstreData.map(item => [
            dayjs(item.islemTarihi).format('DD.MM.YYYY'),
            item.islemTipi === 'Hakediş' ? 'Tahakkuk' : item.islemTipi,
            item.aciklama || '-',
            isBorc(item.islemTipi) ? formatMoney(Math.abs(item.tutar)) : '-',
            isAlacak(item.islemTipi) ? formatMoney(Math.abs(item.tutar)) : '-',
            formatMoney(item.bakiyeSonrasi)
        ]);

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 70, theme: 'grid', headStyles: { fillColor: [89, 89, 89] }, styles: { fontSize: 8 } });
        doc.save(`${isim}_Ekstre.pdf`);
    };

    const fetchGecmisPuantajlar = async () => {
        setIsPuantajArsivVisible(true);
        setPuantajArsivLoading(true);
        try {
            const res = await axiosInstance.get('/attendance/archives');
            setPuantajArsivData(res.data);
        } catch (error) {
            message.error("Arşiv alınamadı!");
        } finally {
            setPuantajArsivLoading(false);
        }
    };

    // 🚀 DÜZELTME: SİLME İŞLEMİ ARTIK ZAMAN DAMGASI (islemTarihi) ÜZERİNDEN YAPILIYOR
    const handleArsivSil = async (islemTarihi) => {
        try {
            await axiosInstance.post('/attendance/archives/delete', { islemTarihi });
            message.success("Puantaj iptal edildi ve bakiyeler güncellendi!");
            fetchGecmisPuantajlar(); 
            fetchData(); 
        } catch (error) {
            message.error(error.response?.data?.mesaj || "Silme işlemi başarısız!");
        }
    };

    const arsivColumns = [
        // 🚀 DÜZELTME: Artık Yükleme Zamanını tam saniyesiyle gösteriyoruz
        { title: 'Yükleme Zamanı', dataIndex: '_id', render: val => dayjs(val).format('DD.MM.YYYY HH:mm:ss') },
        { title: 'Örnek Açıklama', dataIndex: 'ornekAciklama', width: 350 },
        { title: 'İşlem Gören Kişi', dataIndex: 'kisiSayisi', align: 'center', render: val => <Tag color="blue">{val} Kişi</Tag> },
        { title: 'Toplam Hakediş Tutarı', dataIndex: 'toplamTutar', align: 'right', render: val => <b style={{ color: '#52c41a' }}>{formatMoney(val)} ₺</b> },
        {
            title: 'İşlem',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="Bu puantajı tamamen silmek üzeresiniz."
                    description="Bu yükleme ile eklenen TÜM BAKİYELER personellerden GERİ ALINACAKTIR. Emin misiniz?"
                    // 🚀 DÜZELTME: record._id artık saniye damgası olduğu için onu yolluyoruz
                    onConfirm={() => handleArsivSil(record._id)}
                    okText="Evet, İptal Et"
                    cancelText="Hayır"
                >
                    <Button type="primary" danger size="small" icon={<DeleteOutlined />}>Geri Al</Button>
                </Popconfirm>
            )
        }
    ];

    const ekstreColumns = [
        { title: 'Tarih', key: 'tarih', dataIndex: 'islemTarihi', width: 130, render: val => dayjs(val).format('DD.MM.YYYY HH:mm') },
        { title: 'Evrak Cinsi', key: 'evrakCinsi', dataIndex: 'islemTipi', width: 150, render: val => <b>{val === 'Hakediş' ? 'Personel Tahakkuku' : (val === 'Ödeme' ? 'Kasa Tediye Fişi' : val)}</b> },
        { title: 'Açıklama', key: 'aciklama', dataIndex: 'aciklama' },
        { title: 'TL Borç (Ödenen)', key: 'borc', dataIndex: 'tutar', align: 'right', width: 120, render: (val, record) => isBorc(record.islemTipi) ? <Text type="danger">{formatMoney(Math.abs(val))} ₺</Text> : '-' },
        { title: 'TL Alacak (Hakediş)', key: 'alacak', dataIndex: 'tutar', align: 'right', width: 120, render: (val, record) => isAlacak(record.islemTipi) ? <Text type="success">{formatMoney(Math.abs(val))} ₺</Text> : '-' },
        { title: 'Yürüyen Bakiye', key: 'bakiye', dataIndex: 'bakiyeSonrasi', align: 'right', width: 120, render: val => <b style={{ color: val < 0 ? '#3f8600' : (val > 0 ? '#cf1322' : '#000') }}>{formatMoney(val)} ₺</b> },
        {
            title: '',
            key: 'islem',
            width: 50,
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="İptal Onayı"
                    description="Bu hareketi silmek bakiyeyi otomatik güncelleyecektir. Emin misiniz?"
                    onConfirm={() => handleEkstreSil(record._id)}
                    okText="Evet, Sil"
                    cancelText="Hayır"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            )
        }
    ];

    const columns = [
        {
            title: 'Personel Bilgisi',
            key: 'personel',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '14px' }}>{getAdSoyad(record)}</b><br />
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {record.pozisyon || record.position}
                        {record.mikroId && <Tag color="blue" style={{ marginLeft: '8px', fontSize: '10px' }}>Cihaz ID: {record.mikroId}</Tag>}
                    </span>
                </div>
            )
        },
        {
            title: 'Cari Durum (Maliyet & Bakiye)',
            key: 'hesap',
            render: (_, record) => {
                const bakiye = getBakiye(record);
                const ucret = record.ucretMiktari || record.daily_wage || 0;
                const tip = record.ucretTipi || (record.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük');
                const tipColor = tip === 'Saatlik' ? 'purple' : 'cyan';

                let bakiyeEtiket;
                if (bakiye > 0) {
                    bakiyeEtiket = <Tag color="error" style={{ fontSize: '13px', padding: '2px 8px' }}>Bizden Alacaklı: {formatMoney(bakiye)} ₺</Tag>;
                } else if (bakiye < 0) {
                    bakiyeEtiket = <Tag color="success" style={{ fontSize: '13px', padding: '2px 8px' }}>Bize Borçlu: {formatMoney(Math.abs(bakiye))} ₺</Tag>;
                } else {
                    bakiyeEtiket = <Tag color="default" style={{ fontSize: '13px', padding: '2px 8px' }}>Bakiye Sıfır</Tag>;
                }

                return (
                    <div>
                        {bakiyeEtiket}<br />
                        <span style={{ fontSize: '12px', color: '#595959', marginTop: '4px', display: 'inline-block' }}>
                            <Tag color={tipColor} bordered={false} style={{ fontSize: '10px', padding: '0 4px', marginRight: 4 }}>{tip}</Tag>
                            {formatMoney(ucret)} ₺
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
                    { key: '4', label: 'Sil', icon: <DeleteOutlined />, danger: true, onClick: () => showDeleteConfirm(getId(record)) },
                ];
                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px', color: '#595959' }} />} />
                    </Dropdown>
                );
            }
        }
    ];

    const toplamIceridekiPara = data
        .filter(d => getBakiye(d) > 0)
        .reduce((acc, curr) => acc + getBakiye(curr), 0);
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
                        <Statistic title="Ödenecek Toplam Bakiye (Şirket Borcu)" value={toplamIceridekiPara} prefix={<DollarOutlined />} formatter={(value) => formatMoney(value)} suffix="₺" styles={{ content: { color: '#cf1322', fontWeight: 'bold' } }} />
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
                        {/* 🚀 YENİ EKLENEN BOZUK BAKİYE ONAR BUTONU
                        <Button 
                            type="dashed" 
                            danger 
                            icon={<ToolOutlined />} 
                            onClick={async () => {
                                try {
                                    message.loading({ content: 'Hesaplar onarılıyor...', key: 'onarim' });
                                    const res = await axiosInstance.post('/employees/fix-balances');
                                    message.success({ content: res.data.mesaj, key: 'onarim', duration: 3 });
                                    fetchData(); // Tabloyu yenile
                                } catch (e) {
                                    message.error({ content: "Onarım yapılamadı.", key: 'onarim' });
                                }
                            }}
                        >
                            Bozuk Bakiyeleri Onar
                        </Button> */}
                        <Button type="default" icon={<HistoryOutlined />} onClick={fetchGecmisPuantajlar}>
                            Geçmiş Puantajları Yönet
                        </Button>
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
                    rowKey={(record) => getId(record)}
                    loading={loading}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="middle"
                />
            </Card>

            <Modal title={editingEmployee ? "Personel Güncelle" : "Yeni Personel Kaydı"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} okText="Kaydet" cancelText="Vazgeç" destroyOnHidden>
                <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 15 }}>
                    <Form.Item name="mikroId" label="Parmak İzi / Cihaz No (Excel'deki ID)" tooltip="Puantaj Excel'inden okuma yapabilmesi için Excel'deki 'PersonelNo' ile aynı olmalıdır.">
                        <Input placeholder="Örn: 105" />
                    </Form.Item>
                    <Form.Item name="adSoyad" label="Ad Soyad" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="pozisyon" label="Görev / Pozisyon" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="ucretTipi" label="Ücret Hesaplama Tipi" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Saatlik">Saatlik (Giriş-Çıkış saatine göre)</Select.Option>
                            <Select.Option value="Günlük">Günlük (Sabit yevmiye)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="ucretMiktari" label="Birim Ücreti (₺)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} size="large" step={0.01} />
                    </Form.Item>
                    <Form.Item name="telefon" label="Telefon"><Input /></Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<span><HistoryOutlined /> Geçmiş Puantaj Arşivi</span>}
                open={isPuantajArsivVisible}
                onCancel={() => setIsPuantajArsivVisible(false)}
                footer={null}
                width={850}
                destroyOnHidden
            >
                <Alert
                    message="Dikkat: Bir puantajı geri aldığınızda (İptal Et), o puantaj ile personellere eklenen TÜM BAKİYELER sıfırlanıp eski haline döner."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 15 }}
                />
                <Table
                    columns={arsivColumns}
                    dataSource={puantajArsivData}
                    rowKey="_id"
                    loading={puantajArsivLoading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                />
            </Modal>

            <Modal title={<><WalletOutlined style={{ color: '#cf1322' }} /> Personele Ödeme Yap</>} open={isPayModalVisible} onCancel={() => setIsPayModalVisible(false)} onOk={handlePayment} okText="Ödemeyi Tamamla" cancelText="Vazgeç" okButtonProps={{ danger: true }} destroyOnHidden>
                {payEmployee && (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        <Title level={4} style={{ marginBottom: 5 }}>{getAdSoyad(payEmployee)}</Title>
                        <p style={{ color: '#8c8c8c' }}>İçerideki Alacağı: <b style={{ color: getBakiye(payEmployee) > 0 ? '#cf1322' : '#52c41a', fontSize: '16px' }}>{formatMoney(getBakiye(payEmployee))} ₺</b></p>
                        <Alert message="DİKKAT: Bu işlem şirketin kasasından para çıkarır." type="error" showIcon style={{ marginBottom: 15, textAlign: 'left' }} />
                        <p style={{ marginBottom: 5 }}>Ödenecek Tutar (₺):</p>
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} step={0.01} value={payAmount} onChange={(value) => setPayAmount(value)} />
                    </div>
                )}
            </Modal>

            <Modal title={<><RollbackOutlined style={{ color: '#52c41a' }} /> Avans İadesi Al / Tahsilat</>} open={isRefundModalVisible} onCancel={() => setIsRefundModalVisible(false)} onOk={handleRefund} okText="Tahsilatı Kaydet" cancelText="Vazgeç" okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }} destroyOnHidden>
                {refundEmployee && (
                    <div style={{ textAlign: 'center', padding: '15px 0' }}>
                        <Title level={4} style={{ marginBottom: 5 }}>{getAdSoyad(refundEmployee)}</Title>
                        <p style={{ color: '#8c8c8c' }}>Personele Olan Güncel Borcumuz: <b style={{ color: getBakiye(refundEmployee) > 0 ? '#cf1322' : '#52c41a', fontSize: '16px' }}>{formatMoney(getBakiye(refundEmployee))} ₺</b></p>
                        <Alert message="Bu işlem çalışanın şirkete nakit para getirdiğini varsayar. Kasaya GELİR olarak yansır." type="success" showIcon style={{ marginBottom: 15, textAlign: 'left' }} />
                        <p style={{ marginBottom: 5 }}>Alınan İade Tutarı (₺):</p>
                        <InputNumber style={{ width: '100%', maxWidth: '250px' }} size="large" min={0} step={0.01} value={refundAmount} onChange={(value) => setRefundAmount(value)} />
                    </div>
                )}
            </Modal>

            <Modal title={selectedPersonel ? `${getAdSoyad(selectedPersonel)} - Manuel Tahakkuk` : "Tahakkuk İşlemi"} open={isTahakkukModalVisible} onCancel={() => setIsTahakkukModalVisible(false)} footer={null} destroyOnHidden>
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 5 }}>
                    <p style={{ margin: 0 }}><b>Kayıtlı {selectedPersonel?.ucretTipi} Ücreti:</b> {formatMoney(selectedPersonel?.ucretMiktari || selectedPersonel?.daily_wage)} ₺</p>
                    <p style={{ margin: 0, color: '#cf1322' }}><b>Mevcut Alacak:</b> {formatMoney(getBakiye(selectedPersonel))} ₺</p>
                </div>
                <Form form={tahakkukForm} layout="vertical" onFinish={handleTahakkukSubmit}>
                    <Alert message="Puantaj sistemini kullanmanız önerilir. Bu ekran sadece manuel düzeltmeler içindir." type="info" showIcon style={{ marginBottom: 15 }} />
                    <Form.Item name="period_type" label="Hesaplama Periyodu" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Haftalık">Haftalık (6 Gün)</Select.Option>
                            <Select.Option value="Aylık">Aylık (26 Gün)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="calisilanGunManuel" label="Çalışılan Gün/Saat Miktarı"><InputNumber style={{ width: '100%' }} size="large" min={0.5} step={0.01} /></Form.Item>
                    <Button type="primary" htmlType="submit" loading={tahakkukLoading} block size="large" style={{ marginTop: 10 }}>Tahakkuk Fişini Kaydet</Button>
                </Form>
            </Modal>

            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 30 }}>
                        <span>{getAdSoyad(ekstrePersonel)} - Detaylı Hesap Ekstresi</span>
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
                                <Table.Summary.Cell index={0} colSpan={3} align="right">GENEL TOPLAM:</Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right"><Text type="danger">{formatMoney(totalBorc)} ₺</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right"><Text type="success">{formatMoney(totalAlacak)} ₺</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={5} colSpan={2} align="center">
                                    <span style={{ color: netBakiye > 0 ? '#cf1322' : (netBakiye < 0 ? '#3f8600' : '#000') }}>{formatMoney(netBakiye)} ₺</span>
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