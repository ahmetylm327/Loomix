import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, message, Modal, Tag } from 'antd';
import { SearchOutlined, FileExcelOutlined, FilePdfOutlined, TeamOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ParaInput from '../pages/ParaInput'; // Dosya yolunu kendi klasör yapına göre kontrol et!

const { Title, Text } = Typography;

const CariHareketleri = () => {
    const [cariler, setCariler] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState([]);
    const [ekstreOzet, setEkstreOzet] = useState({});
    const [ekstreLoading, setEkstreLoading] = useState(false);
    const [seciliCari, setSeciliCari] = useState(null);

    // Para formatlayıcı fonksiyon
    const formatPara = (val) => val?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    useEffect(() => { fetchCariler(); }, []);

    const fetchCariler = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/caris');
            setCariler(response.data);
        } catch (error) {
            message.error("Firma listesi alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const handleDetayGor = async (cari) => {
        setSeciliCari(cari);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const res = await axiosInstance.get(`/caris/${cari._id}/ekstre`);
            setEkstreData(res.data.liste);
            setEkstreOzet({
                toplamBorc: res.data.toplamBorc,
                toplamAlacak: res.data.toplamAlacak,
                bakiye: res.data.bakiye
            });
        } catch (error) {
            message.error("Cari hareketleri alınamadı!");
        } finally {
            setEkstreLoading(false);
        }
    };

    // ... (exportEkstreExcel ve exportEkstrePDF fonksiyonların aynı kalabilir)

    const anaTabloColumns = [
        {
            title: 'Firma Bilgisi',
            key: 'firmaAdi',
            render: (_, record) => (
                <div>
                    <b style={{ fontSize: '15px' }}>{record.firmaAdi}</b><br />
                    <small style={{ color: '#8c8c8c' }}>{record.kategori || 'Genel'}</small>
                </div>
            )
        },
        { title: 'Telefon', dataIndex: 'telefon', render: t => t || '-' },
        {
            title: 'Güncel Bakiye',
            dataIndex: 'bakiye',
            align: 'right',
            render: val => (
                <Tag color={val > 0 ? "error" : (val < 0 ? "success" : "default")} style={{ fontSize: '14px', padding: '4px 8px' }}>
                    {val > 0 ? `Bize Borçlu: ${formatPara(val)}` : (val < 0 ? `Bizden Alacaklı: ${formatPara(Math.abs(val))}` : 'Bakiye Sıfır')}
                </Tag>
            )
        },
        {
            title: 'Aksiyon',
            key: 'aksiyon',
            align: 'center',
            render: (_, record) => (
                <Button type="primary" icon={<SearchOutlined />} onClick={() => handleDetayGor(record)}>
                    Detaylı Ekstre
                </Button>
            )
        }
    ];

    const ekstreColumns = [
        { title: 'Tarih', dataIndex: 'tarih', width: 110, render: val => dayjs(val).format('DD.MM.YYYY') },
        { title: 'İşlem Cinsi', dataIndex: 'islemCinsi', width: 140, render: val => <b>{val}</b> },
        { title: 'Açıklama', dataIndex: 'aciklama' },
        { title: 'Borç (TL)', dataIndex: 'borc', align: 'right', width: 120, render: val => val > 0 ? <Text type="danger">{formatPara(val)}</Text> : '-' },
        { title: 'Alacak (TL)', dataIndex: 'alacak', align: 'right', width: 120, render: val => val > 0 ? <Text type="success">{formatPara(val)}</Text> : '-' },
        { title: 'Bakiye', dataIndex: 'yuruyenBakiye', align: 'right', width: 130, render: val => <b style={{ color: val > 0 ? '#cf1322' : '#000' }}>{formatPara(val)}</b> }
    ];

    return (
        <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={3} style={{ marginBottom: 20 }}><TeamOutlined /> Müşteri & Tedarikçi Cari Hareketleri</Title>

            <Card variant="borderless" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table columns={anaTabloColumns} dataSource={cariler} loading={loading} rowKey="_id" size="middle" />
            </Card>

            <Modal
                title={<span><b style={{ color: '#1890ff' }}>{seciliCari?.firmaAdi}</b> - Detaylı Hesap Ekstresi</span>}
                open={isEkstreVisible}
                onCancel={() => setIsEkstreVisible(false)}
                footer={null}
                width={950}
                destroyOnClose
            >
                <Table
                    columns={ekstreColumns}
                    dataSource={ekstreData}
                    rowKey="key"
                    loading={ekstreLoading}
                    pagination={{ pageSize: 12 }}
                    size="small"
                    bordered
                    summary={() => (
                        <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold', fontSize: '14px' }}>
                            <Table.Summary.Cell index={0} colSpan={3} align="right">GENEL TOPLAM:</Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><Text type="danger">{formatPara(ekstreOzet.toplamBorc || 0)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Text type="success">{formatPara(ekstreOzet.toplamAlacak || 0)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                                <span style={{ color: ekstreOzet.bakiye > 0 ? '#cf1322' : '#000' }}>{formatPara(ekstreOzet.bakiye || 0)}</span>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />
            </Modal>
        </div>
    );
};

export default CariHareketleri;