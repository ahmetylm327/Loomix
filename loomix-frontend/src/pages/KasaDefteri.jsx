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
    const [personeller, setPersoneller] = useState([]); // 🚀 YENİ: İşçi listesi eklendi
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingOdeme, setEditingOdeme] = useState(null);
    const [stats, setStats] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0 });
    const [seciliKategori, setSeciliKategori] = useState(''); // 🚀 YENİ: Seçilen kategoriyi takip edeceğiz

    useEffect(() => {
        fetchData();
        fetchCariler();
        fetchPersoneller(); // 🚀 Sayfa açıldığında personelleri de çeker
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/payments');
            let islemler = response.data;

            // 🚀 ÇÖZÜM 1: TARİHE GÖRE KRONOLOJİK SIRALAMA (En yeni tarih en üstte)
            islemler.sort((a, b) => {
                const tarihA = dayjs(a.odemeTarihi || a.paymentDate).valueOf();
                const tarihB = dayjs(b.odemeTarihi || b.paymentDate).valueOf();
                return tarihB - tarihA;
            });

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

    const fetchPersoneller = async () => {
        try {
            // Arka plandaki route ismine göre ikisinden birini dener
            let response;
            try { response = await axiosInstance.get('/employees'); }
            catch (e) { response = await axiosInstance.get('/personel'); }

            setPersoneller(response.data);
        } catch (error) { console.log("Personel listesi alınamadı."); }
    };

    const handleSave = async (values) => {
        try {
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
            setSeciliKategori('');
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.description || "Kayıt başarısız! Eksik alanları kontrol edin.");
        }
    };

    const showDeleteConfirm = (id) => {
        confirm({
            title: 'Kasa İşlemini Sil',
            content: 'Bu işlemi silerseniz hesap bakiyeleri (Firma/Personel) tersine dönecektir! Emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() {
                axiosInstance.delete(`/payments/${id}`).then(() => {
                    message.success("İşlem silindi ve bakiyeler güncellendi!");
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
                const islemKategori = record.kategori || record.category;
                const rId = typeof record.relatedId === 'object' ? record.relatedId?._id : record.relatedId;

                // Kategoriye göre ilgili kişiyi bul (Firma veya İşçi)
                let muhatapAdi = 'Genel Kasa İşlemi';
                if (islemKategori === 'Personel' || islemKategori === 'Maaş') {
                    const isci = personeller.find(p => p._id === rId);
                    if (isci) muhatapAdi = isci.adSoyad || isci.isim;
                } else {
                    const cari = cariler.find(c => c._id === rId);
                    if (cari) muhatapAdi = cari.firmaAdi;
                }

                const tip = record.islemYonu || record.transactionType;
                const gosterilecekNot = record.notlar || record.notes || record.aciklama || record.description;

                return (
                    <div>
                        <b style={{ fontSize: '14px', color: (islemKategori === 'Personel' ? '#faad14' : '#1890ff') }}>
                            {muhatapAdi}
                        </b><br />
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {dayjs(record.odemeTarihi || record.paymentDate).format('DD.MM.YYYY')} - {islemKategori || 'Genel'}
                        </span>

                        {gosterilecekNot && (
                            <div style={{
                                fontSize: '11px', color: '#595959', fontStyle: 'italic', marginTop: 4,
                                whiteSpace: 'normal', wordBreak: 'break-word', background: '#fafafa',
                                padding: '4px 6px', borderRadius: '4px', borderLeft: '2px solid #d9d9d9'
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
                            const currentCat = record.kategori || record.category;
                            setSeciliKategori(currentCat); // Kategori bilgisini state'e at

                            form.setFieldsValue({
                                ...record,
                                islemYonu: record.islemYonu || record.transactionType,
                                tutar: record.tutar || record.amount,
                                kategori: currentCat,
                                odemeTipi: record.odemeTipi || record.paymentType,
                                odemeTarihi: dayjs(record.odemeTarihi || record.paymentDate),
                                relatedId: record.relatedId?._id || record.relatedId,
                                notlar: record.notlar || record.notes || record.aciklama
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
                        <Statistic title="Toplam Tahsilat (Gelir)" value={stats.toplamGelir} precision={2} styles={{ content: { color: '#52c41a' } }} prefix={<ArrowUpOutlined />} suffix="₺" />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #ff4d4f', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Toplam Ödeme (Gider)" value={stats.toplamGider} precision={2} styles={{ content: { color: '#ff4d4f' } }} prefix={<ArrowDownOutlined />} suffix="₺" />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #1890ff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic title="Kasa Mevcudu" value={stats.netBakiye} precision={2} styles={{ content: { color: '#1890ff' } }} prefix={<WalletOutlined />} suffix="₺" />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" style={{ borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Space>
                        <WalletOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Kasa Defteri</span>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingOdeme(null);
                        setSeciliKategori(''); // Yeni eklerken kategoriyi sıfırla
                        form.resetFields();
                        setIsModalVisible(true);
                    }}>
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

                    {/* 🚀 ÇÖZÜM 2: Kategoriye onChange eklendi, arka planla birebir eşleşen value'lar kullanıldı */}
                    <Form.Item name="kategori" label="İşlem Kategorisi" rules={[{ required: true, message: 'Lütfen bir kategori seçin!' }]}>
                        <Select
                            placeholder="Kategori Seçiniz"
                            size="large"
                            onChange={(value) => {
                                setSeciliKategori(value); // Seçimi kaydet
                                form.setFieldsValue({ relatedId: undefined }); // Kategori değişirse kişiyi temizle!
                            }}
                        >
                            <Option value="Cari">Firma (Cari) İşlemi</Option>
                            <Option value="Personel">Personel İşlemi (Maaş/Avans)</Option>
                            <Option value="Kumaş/Malzeme">Kumaş/Malzeme</Option>
                            <Option value="Fason Dikim">Fason Dikim</Option>
                            <Option value="Yol/Yemek">Yol/Yemek</Option>
                            <Option value="Kira/Fatura">Kira/Fatura</Option>
                            <Option value="Diğer">Diğer</Option>
                        </Select>
                    </Form.Item>

                    {/* 🚀 AKILLI AÇILIR KUTU: Personel seçiliyse işçiler, Cari seçiliyse firmalar, diğeri ise gizlenir */}
                    {(seciliKategori === 'Cari' || seciliKategori === 'Personel') && (
                        <Form.Item name="relatedId" label={seciliKategori === 'Personel' ? "İlgili Personel" : "İlgili Firma (Cari)"} rules={[{ required: true, message: 'Lütfen muhatap seçiniz!' }]}>
                            <Select showSearch placeholder="Seçiniz..." size="large" allowClear optionFilterProp="children">
                                {seciliKategori === 'Personel'
                                    ? personeller.map(p => <Option key={p._id} value={p._id}>{p.adSoyad || p.isim}</Option>)
                                    : cariler.map(c => <Option key={c._id} value={c._id}>{c.firmaAdi}</Option>)
                                }
                            </Select>
                        </Form.Item>
                    )}

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
                        <Input.TextArea rows={2} placeholder="Fatura, dekont veya maaş ay açıklaması..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default KasaDefteri;