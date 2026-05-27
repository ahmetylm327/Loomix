import React, { useEffect, useState } from 'react';
import {
    Table, Card, Typography, Button, Modal, Form, Select,
    InputNumber, DatePicker, Input, message, Tag, Row, Col,
    Statistic, Space, Dropdown, Tabs
} from 'antd';
import {
    PlusOutlined, WalletOutlined, ArrowUpOutlined,
    ArrowDownOutlined, EditOutlined, DeleteOutlined, MoreOutlined,
    FileTextOutlined, GlobalOutlined, FilterOutlined, ShoppingOutlined
} from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const KasaDefteri = () => {
    const [kasaData, setKasaData] = useState([]);
    const [uretimData, setUretimData] = useState([]);
    const [konsolideData, setKonsolideData] = useState([]);
    const [malAlimiData, setMalAlimiData] = useState([]);

    const [cariler, setCariler] = useState([]);
    const [personeller, setPersoneller] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingOdeme, setEditingOdeme] = useState(null);
    const [stats, setStats] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0, toplamAlacak: 0, toplamTedarikciBorc: 0 });
    const [seciliKategori, setSeciliKategori] = useState('');

    const [dateRange, setDateRange] = useState(null);
    const [selectedFirma, setSelectedFirma] = useState(null);

    useEffect(() => {
        fetchTumVeriler();
    }, []);

    const fetchTumVeriler = async () => {
        setLoading(true);
        try {
            const [kasaRes, uretimRes, cariRes, personelRes1, personelRes2] = await Promise.all([
                axiosInstance.get('/payments').catch(() => ({ data: [] })),
                axiosInstance.get('/production').catch(() => ({ data: [] })),
                axiosInstance.get('/caris').catch(() => ({ data: [] })),
                axiosInstance.get('/employees').catch(() => null),
                axiosInstance.get('/personel').catch(() => null)
            ]);

            let tumOdemeler = kasaRes.data || [];
            let uretimler = uretimRes.data || [];
            let firmalar = cariRes.data || [];
            let isciler = (personelRes1 && personelRes1.data) ? personelRes1.data : ((personelRes2 && personelRes2.data) ? personelRes2.data : []);

            setCariler(firmalar);
            setPersoneller(isciler);

            // Mal alımlarını ayır
            const malAlimleri = tumOdemeler
                .filter(k => k.islemYonu === 'MalAlimi')
                .map(k => ({ ...k, islemTuru: 'MalAlimi' }));

            // Normal kasa işlemleri (Gelir/Gider)
            let kasalar = tumOdemeler
                .filter(k => k.islemYonu === 'Gelir' || k.islemYonu === 'Gider')
                .map(k => ({ ...k, islemTuru: 'Kasa' }));

            let gelir = 0;
            let gider = 0;
            kasalar.forEach(islem => {
                const tutarVal = Number(islem.tutar || islem.amount) || 0;
                if (islem.islemYonu === 'Gelir') gelir += tutarVal;
                else if (islem.islemYonu === 'Gider') gider += tutarVal;
            });

            // Müşteri alacakları (pozitif bakiyeli müşteriler)
            let gercekAlacak = 0;
            let tedarikciBorc = 0;
            firmalar.forEach(firma => {
                const bakiye = Number(firma.bakiye) || 0;
                if (['Tedarikçi', 'Toptancı'].includes(firma.kategori)) {
                    tedarikciBorc += bakiye; // Tedarikçi bakiyesi = bizim borcumuz
                } else {
                    gercekAlacak += bakiye;  // Müşteri bakiyesi = bizim alacağımız
                }
            });

            // Üretim fişleri
            let formatliUretimler = uretimler.map(u => {
                const uTutar = (u.quantity || 0) * (u.birimFiyat || 0);
                return {
                    ...u,
                    _id: u._id,
                    islemTuru: 'Uretim',
                    tutar: uTutar,
                    islemYonu: 'Alacak',
                    odemeTarihi: u.productionDate || u.createdAt,
                    kategori: 'Üretim / Fiş Kesimi',
                    cariAdi: u.cariId?.firmaAdi || 'Bilinmeyen Firma',
                    urunAdi: u.productId?.urunAdi || 'Ürün'
                };
            });

            const siralamaAlgoritmasi = (a, b) => {
                const dateA = a.odemeTarihi || a.paymentDate;
                const dateB = b.odemeTarihi || b.paymentDate;
                const dayA = dateA ? dayjs(dateA).startOf('day').valueOf() : 0;
                const dayB = dateB ? dayjs(dateB).startOf('day').valueOf() : 0;
                if (dayA !== dayB) return dayB - dayA;
                const idA = a._id?.toString() || "";
                const idB = b._id?.toString() || "";
                return idB.localeCompare(idA);
            };

            let birlesikListe = [...kasalar, ...formatliUretimler];

            kasalar.sort(siralamaAlgoritmasi);
            formatliUretimler.sort(siralamaAlgoritmasi);
            birlesikListe.sort(siralamaAlgoritmasi);
            malAlimleri.sort(siralamaAlgoritmasi);

            setKasaData(kasalar);
            setUretimData(formatliUretimler);
            setKonsolideData(birlesikListe);
            setMalAlimiData(malAlimleri);

            setStats({
                toplamGelir: gelir,
                toplamGider: gider,
                netBakiye: gelir - gider,
                toplamAlacak: gercekAlacak,
                toplamTedarikciBorc: tedarikciBorc
            });

        } catch (error) {
            message.error("Veriler hesaplanırken hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    const filtreleData = (dataList) => {
        return dataList.filter(item => {
            let dateMatch = true;
            let firmaMatch = true;

            if (dateRange && dateRange[0] && dateRange[1]) {
                const itemDate = dayjs(item.odemeTarihi || item.paymentDate);
                dateMatch = itemDate.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'), null, '[]');
            }

            if (selectedFirma) {
                const rId = typeof item.relatedId === 'object' ? item.relatedId?._id : item.relatedId;
                const cId = typeof item.cariId === 'object' ? item.cariId?._id : item.cariId;
                firmaMatch = (rId === selectedFirma) || (cId === selectedFirma);
            }

            return dateMatch && firmaMatch;
        });
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
                message.success("İşlem başarıyla eklendi ve ilgili hesaba yansıdı.");
            }

            setIsModalVisible(false);
            setEditingOdeme(null);
            setSeciliKategori('');
            form.resetFields();
            fetchTumVeriler();
        } catch (error) {
            message.error("Kayıt başarısız! Eksik alanları kontrol edin.");
        }
    };

    const showDeleteConfirm = (id, islemTuru) => {
        if (islemTuru === 'Uretim') {
            message.warning("Fiş iptal işlemleri sadece 'Üretimler / Fişler' sayfasından yapılabilir!");
            return;
        }

        confirm({
            title: 'Kasa İşlemini Sil',
            content: 'Bu işlemi silerseniz hesap bakiyeleri (Firma/Personel) tersine dönecektir! Emin misiniz?',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Vazgeç',
            onOk() {
                axiosInstance.delete(`/payments/${id}`).then(() => {
                    message.success("İşlem silindi ve bakiyeler güncellendi!");
                    fetchTumVeriler();
                }).catch(() => message.error("Silme işlemi başarısız!"));
            },
        });
    };

    const getColumns = (isMalAlimiTab = false) => [
        {
            title: 'İşlem Detayı',
            key: 'detay',
            render: (_, record) => {
                const islemKategori = record.kategori || record.category;
                let muhatapAdi = 'Genel / Muhtelif İşlem';
                let renk = '#8c8c8c';

                if (record.islemTuru === 'Uretim') {
                    muhatapAdi = record.cariAdi;
                    renk = '#722ed1';
                } else if (record.islemTuru === 'MalAlimi') {
                    const rId = typeof record.ilgiliId === 'object' ? record.ilgiliId?._id : record.ilgiliId;
                    const cari = cariler.find(c => c._id === rId?.toString());
                    muhatapAdi = cari ? cari.firmaAdi : 'Bilinmeyen Tedarikçi';
                    renk = '#d46b08';
                } else {
                    const rId = typeof record.relatedId === 'object' ? record.relatedId?._id : record.relatedId;
                    if (rId === 'SAHSI_HARCAMA') {
                        muhatapAdi = 'Şahsi / Şirket İçi Harcama';
                        renk = '#cf1322';
                    } else if (islemKategori === 'Personel İşlemi (Maaş/Avans)') {
                        const isci = personeller.find(p => p._id === rId);
                        if (isci) { muhatapAdi = isci.adSoyad || isci.isim; renk = '#faad14'; }
                    } else {
                        const cari = cariler.find(c => c._id === rId);
                        if (cari) { muhatapAdi = cari.firmaAdi; renk = '#1890ff'; }
                    }
                }

                const tip = record.islemYonu || record.transactionType;
                const gosterilecekNot = record.islemTuru === 'Uretim'
                    ? `Satılan Ürün: ${record.urunAdi} - ${record.quantity} Adet. ${record.notes || ''}`
                    : (record.notlar || record.notes || record.aciklama || record.description);

                return (
                    <div>
                        <b style={{ fontSize: '14px', color: renk }}>{muhatapAdi}</b><br />
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {record.odemeTarihi || record.paymentDate ? dayjs(record.odemeTarihi || record.paymentDate).format('DD.MM.YYYY') : '-'} - {islemKategori || 'Genel'}
                        </span>
                        {gosterilecekNot && (
                            <div style={{
                                fontSize: '11px', color: '#595959', fontStyle: 'italic', marginTop: 4,
                                whiteSpace: 'normal', wordBreak: 'break-word',
                                background: '#fafafa', padding: '4px 6px', borderRadius: '4px', borderLeft: '2px solid #d9d9d9'
                            }}>
                                {gosterilecekNot}
                            </div>
                        )}
                        <div style={{ marginTop: 6 }}>
                            {record.islemTuru === 'Uretim' ? (
                                <Tag color="purple" icon={<FileTextOutlined />} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                                    KESİLEN FİŞ (ALACAK)
                                </Tag>
                            ) : record.islemTuru === 'MalAlimi' ? (
                                <Tag color="orange" icon={<ShoppingOutlined />} style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                                    KUMAŞ TEDARİĞİ (BORÇ)
                                </Tag>
                            ) : (
                                <Tag
                                    color={tip === 'Gelir' ? 'success' : 'error'}
                                    icon={tip === 'Gelir' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                    style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}
                                >
                                    {tip === 'Gelir' ? 'TAHSİLAT (KASA)' : 'ÖDEME (KASA)'}
                                </Tag>
                            )}
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
                const tutarVal = record.tutar || record.amount || 0;
                const tip = record.islemYonu || record.transactionType;

                let mRenk = '#595959';
                let isaret = '';

                if (record.islemTuru === 'Uretim') { mRenk = '#722ed1'; isaret = '+'; }
                else if (record.islemTuru === 'MalAlimi') { mRenk = '#d46b08'; isaret = '-'; }
                else if (tip === 'Gelir') { mRenk = '#52c41a'; isaret = '+'; }
                else if (tip === 'Gider') { mRenk = '#ff4d4f'; isaret = '-'; }

                return (
                    <b style={{ color: mRenk, fontSize: '15px' }}>
                        {isaret}{tutarVal?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
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
                if (record.islemTuru === 'Uretim') return null;

                const items = [
                    {
                        key: '1',
                        label: 'Düzenle',
                        icon: <EditOutlined style={{ color: '#1890ff' }} />,
                        onClick: () => {
                            setEditingOdeme(record);
                            const currentCat = record.kategori || record.category;
                            setSeciliKategori(currentCat);
                            form.setFieldsValue({
                                ...record,
                                islemYonu: record.islemYonu === 'MalAlimi' ? 'Gider' : (record.islemYonu || record.transactionType),
                                tutar: record.tutar || record.amount,
                                kategori: currentCat,
                                odemeTipi: record.odemeTipi || record.paymentType,
                                odemeTarihi: dayjs(record.odemeTarihi || record.paymentDate),
                                relatedId: record.ilgiliId?._id || record.ilgiliId || record.relatedId?._id || record.relatedId,
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
                        onClick: () => showDeleteConfirm(record._id || record.transactionId, record.islemTuru)
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

            {/* ÜST KARTLAR */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #1890ff', background: '#e6f7ff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 'bold' }}>1. Kasa (Sıcak Nakit)</span>}
                            value={stats.netBakiye}
                            precision={2}
                            styles={{ content: { color: '#1890ff', fontWeight: 'bold' } }}
                            prefix={<WalletOutlined />}
                            suffix="₺"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #722ed1', background: '#f9f0ff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 'bold' }}>2. Piyasada Bekleyen (Alacaklar)</span>}
                            value={stats.toplamAlacak}
                            precision={2}
                            styles={{ content: { color: '#722ed1', fontWeight: 'bold' } }}
                            prefix={<FileTextOutlined />}
                            suffix="₺"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #d46b08', background: '#fff7e6', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 'bold' }}>3. Tedarikçi Borçları</span>}
                            value={stats.toplamTedarikciBorc}
                            precision={2}
                            styles={{ content: { color: '#d46b08', fontWeight: 'bold' } }}
                            prefix={<ShoppingOutlined />}
                            suffix="₺"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card variant="borderless" style={{ borderLeft: '5px solid #52c41a', background: '#f6ffed', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 'bold' }}>4. ŞİRKET NET VARLIĞI</span>}
                            value={stats.netBakiye + stats.toplamAlacak - stats.toplamTedarikciBorc}
                            precision={2}
                            styles={{ content: { color: '#52c41a', fontWeight: 'bold', fontSize: '22px' } }}
                            prefix={<GlobalOutlined />}
                            suffix="₺"
                        />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" style={{ borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 15 }}>
                    <Space>
                        <WalletOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Kasa & Finans Defteri</span>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingOdeme(null);
                        setSeciliKategori('');
                        form.resetFields();
                        setIsModalVisible(true);
                    }}>
                        Yeni Kasa İşlemi
                    </Button>
                </div>

                {/* FİLTRELEME */}
                <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e8e8e8' }}>
                    <Row gutter={16} align="middle">
                        <Col xs={24} sm={2}>
                            <b style={{ color: '#595959' }}><FilterOutlined /> Tabloyu Süz:</b>
                        </Col>
                        <Col xs={24} sm={10}>
                            <RangePicker style={{ width: '100%' }} format="DD.MM.YYYY" onChange={(dates) => setDateRange(dates)} placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']} />
                        </Col>
                        <Col xs={24} sm={10}>
                            <Select style={{ width: '100%' }} placeholder="Firma Seçin (Tümü İçin Boş Bırakın)" allowClear showSearch optionFilterProp="children" onChange={(val) => setSelectedFirma(val)}>
                                {cariler.map(cari => (<Option key={cari._id} value={cari._id}>{cari.firmaAdi}</Option>))}
                            </Select>
                        </Col>
                    </Row>
                </div>

                <Tabs defaultActiveKey="3" items={[
                    {
                        key: '1',
                        label: <span><WalletOutlined /> Sadece Kasa (Nakit)</span>,
                        children: <Table columns={getColumns()} dataSource={filtreleData(kasaData)} rowKey="_id" loading={loading} size="middle" pagination={{ pageSize: 10, size: 'small' }} />
                    },
                    {
                        key: '2',
                        label: <span style={{ color: '#722ed1' }}><FileTextOutlined /> Sadece Fişler (Üretim)</span>,
                        children: <Table columns={getColumns()} dataSource={filtreleData(uretimData)} rowKey="_id" loading={loading} size="middle" pagination={{ pageSize: 10, size: 'small' }} />
                    },
                    {
                        key: '3',
                        label: <span style={{ fontWeight: 'bold', color: '#1890ff' }}><GlobalOutlined /> BÜYÜK RESİM (Tümü)</span>,
                        children: <Table columns={getColumns()} dataSource={filtreleData(konsolideData)} rowKey="_id" loading={loading} size="middle" pagination={{ pageSize: 10, size: 'small' }} />
                    },
                    {
                        key: '4',
                        label: <span style={{ color: '#d46b08' }}><ShoppingOutlined /> Tedarikçi Borçları</span>,
                        children: <Table columns={getColumns(true)} dataSource={filtreleData(malAlimiData)} rowKey="_id" loading={loading} size="middle" pagination={{ pageSize: 10, size: 'small' }}
                            summary={() => {
                                const toplam = filtreleData(malAlimiData).reduce((acc, curr) => acc + (curr.tutar || 0), 0);
                                return (
                                    <Table.Summary.Row style={{ background: '#fff7e6', fontWeight: 'bold' }}>
                                        <Table.Summary.Cell index={0} align="right">Toplam Borç:</Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <b style={{ color: '#d46b08', fontSize: '16px' }}>
                                                {toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </b>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} />
                                    </Table.Summary.Row>
                                );
                            }}
                        />
                    }
                ]} />
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
                        <Select placeholder="Kategori Seçiniz" size="large" onChange={(value) => {
                            setSeciliKategori(value);
                            form.setFieldsValue({ relatedId: undefined });
                        }}>
                            <Option value="Firma (Cari) İşlemi">Genel Cari İşlemi</Option>
                            <Option value="Personel İşlemi (Maaş/Avans)">Personel İşlemi (Maaş/Avans)</Option>
                            <Option value="Kumaş Tedariği">🧵 Malzeme Tedariği</Option>
                            <Option value="Kumaş/Malzeme Ödemesi">💸Malzeme Ödemesi</Option>
                            <Option value="Elektrik Faturası">⚡ Elektrik Faturası</Option>
                            <Option value="Su Faturası">💧 Su Faturası</Option>
                            <Option value="Ortak Gider">🤝 Ortak Gider</Option>
                            <Option value="Dükkan Kirası">🏠 Dükkan Kirası</Option>
                            <Option value="SSK">📋 SSK</Option>
                            <Option value="Diğer">Diğer</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="relatedId" label="İşlemin Muhatabı (Kiminle Yapıldı?)" rules={[{ required: true, message: 'Lütfen işlemin kime ait olduğunu seçiniz!' }]}>
                        <Select showSearch placeholder="Listedeki muhatabı seçin..." size="large" allowClear optionFilterProp="children">
                            {seciliKategori === 'Personel İşlemi (Maaş/Avans)'
                                ? personeller.map(p => <Option key={p._id} value={p._id}>👤 {p.adSoyad || p.isim}</Option>)
                                : (
                                    <>
                                        <Option value="SAHSI_HARCAMA" style={{ color: '#cf1322', fontWeight: 'bold' }}>
                                            ⚠️ Şahsi / Şirket İçi Harcama (Hesaba Yansımaz)
                                        </Option>
                                        {cariler.map(c => <Option key={c._id} value={c._id}>🏢 {c.firmaAdi}</Option>)}
                                    </>
                                )
                            }
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
                        <Input.TextArea rows={2} placeholder="Fatura, dekont veya maaş ay açıklaması..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default KasaDefteri;