import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Layout, Menu, Button, theme, Typography, Spin } from 'antd';
import {
  MenuUnfoldOutlined, MenuFoldOutlined, DashboardOutlined,
  UserOutlined, TeamOutlined, AppstoreOutlined,
  FileDoneOutlined, CodeSandboxOutlined, WalletOutlined,
  BarChartOutlined, RobotOutlined, LogoutOutlined, FileTextOutlined
} from '@ant-design/icons';
import axiosInstance from './api/axiosInstance';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Personeller from './pages/PersonelListesi';
import Cariler from './pages/CariListesi';
import Urunler from './pages/UrunListesi';
import Puantaj from './pages/PuantajYukle';
import Uretim from './pages/UretimListesi';
import KasaDefteri from './pages/KasaDefteri';
import Raporlar from './pages/Raporlar';
import YapayZeka from './pages/YapayZeka';
import CariHareketleri from './pages/CariHareketleri';
import MaasYonetimi from './pages/MaasYonetimi';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 🛡️ Korumalı Route — token yoksa login'e yönlendir
const KorumalıRoute = ({ children, girisYapildi, yukleniyor }) => {
  if (yukleniyor) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  );
  return girisYapildi ? children : <Navigate to="/login" replace />;
};

const AppContent = ({ setGirisYapildi }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer } } = theme.useToken();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (e) { }
    localStorage.removeItem('loomix_token');
    setGirisYapildi(false);
    window.location.href = '/#/login';
  };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Ana Panel (Dashboard)</Link> },
    {
      type: 'group',
      label: '1. SİSTEM TANIMLARI',
      children: [
        { key: '/urunler', icon: <AppstoreOutlined />, label: <Link to="/urunler">Stok / Model Tanımları</Link> },
        { key: '/cariler', icon: <TeamOutlined />, label: <Link to="/cariler">Cari (Firma) Kayıtları</Link> },
        { key: '/personeller', icon: <UserOutlined />, label: <Link to="/personeller">Personel Listesi</Link> },
      ],
    },
    {
      type: 'group',
      label: '2. ÜRETİM VE SAHA',
      children: [
        { key: '/uretim', icon: <CodeSandboxOutlined />, label: <Link to="/uretim">Fiş / Üretim Girişi</Link> },
        { key: '/puantaj', icon: <FileDoneOutlined />, label: <Link to="/puantaj">Puantaj / Mesai Yükle</Link> },
      ],
    },
    {
      type: 'group',
      label: '3. FİNANS YÖNETİMİ',
      children: [
        { key: '/kasa', icon: <WalletOutlined />, label: <Link to="/kasa">Kasa İşlemleri (Gelir/Gider)</Link> },
      ],
    },
    { key: '/maas-yonetimi', icon: <TeamOutlined />, label: <Link to="/maas-yonetimi">Maaş Yönetimi (Cuma Analizi)</Link> },
    {
      type: 'group',
      label: '4. RAPOR VE ANALİZ',
      children: [
        { key: '/cari-hareketleri', icon: <FileTextOutlined />, label: <Link to="/cari-hareketleri">Tüm Cari Hareketler</Link> },
        { key: '/raporlar', icon: <BarChartOutlined />, label: <Link to="/raporlar">Genel Raporlar</Link> },
        { key: '/ai-tahmin', icon: <RobotOutlined />, label: <Link to="/ai-tahmin">Yapay Zeka (AI) Asistan</Link> },
      ],
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={260} theme="dark" style={{ boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)' }}>
        <div style={{
          height: '64px', margin: '16px',
          background: 'linear-gradient(90deg, #1d3557 0%, #457b9d 100%)',
          borderRadius: '8px', display: 'flex', justifyContent: 'center',
          alignItems: 'center', color: 'white', fontWeight: 'bold',
          fontSize: collapsed ? '12px' : '18px', letterSpacing: '1px'
        }}>
          {collapsed ? 'LMX' : 'LOOMIX ERP'}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 0 }} />
        <div style={{ position: 'absolute', bottom: 20, width: '100%', padding: '0 16px' }}>
          <Button type="primary" danger block icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: '6px' }}>
            {!collapsed && 'Güvenli Çıkış'}
          </Button>
        </div>
      </Sider>

      <Layout style={{ background: '#f0f2f5' }}>
        <Header style={{
          padding: 0, background: colorBgContainer,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e8e8e8', height: '64px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '18px', width: 64, height: 64 }} />
            <Text strong style={{ fontSize: '18px', marginLeft: '8px' }}>Atölye Yönetim Paneli</Text>
          </div>
          <div style={{ marginRight: '24px' }}>
            <Text type="secondary">Hoş geldin, <b>Ahmet Yılmaz</b></Text>
          </div>
        </Header>

        <Content style={{ margin: 0, padding: 0, minHeight: 'calc(100vh - 64px)', width: '100%', display: 'flex', background: '#f0f2f5', overflow: 'initial' }}>
          <div style={{ padding: '24px', width: '100%', minHeight: '100%' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/personeller" element={<Personeller />} />
              <Route path="/cariler" element={<Cariler />} />
              <Route path="/urunler" element={<Urunler />} />
              <Route path="/puantaj" element={<Puantaj />} />
              <Route path="/uretim" element={<Uretim />} />
              <Route path="/kasa" element={<KasaDefteri />} />
              <Route path="/raporlar" element={<Raporlar />} />
              <Route path="/ai-tahmin" element={<YapayZeka />} />
              <Route path="/cari-hareketleri" element={<CariHareketleri />} />
              <Route path="/maas-yonetimi" element={<MaasYonetimi />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App = () => {
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Sayfa yenilenince token hala geçerli mi kontrol et
  useEffect(() => {
    const tokenKontrol = async () => {
      const token = localStorage.getItem('loomix_token');
      if (!token) {
        setGirisYapildi(false);
        setYukleniyor(false);
        return;
      }
      try {
        await axiosInstance.get('/stats');
        setGirisYapildi(true);
      } catch (e) {
        localStorage.removeItem('loomix_token');
        setGirisYapildi(false);
      } finally {
        setYukleniyor(false);
      }
    };
    tokenKontrol();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          girisYapildi ? <Navigate to="/" replace /> : <Login setGirisYapildi={setGirisYapildi} />
        } />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={
          <KorumalıRoute girisYapildi={girisYapildi} yukleniyor={yukleniyor}>
            <AppContent setGirisYapildi={setGirisYapildi} />
          </KorumalıRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;