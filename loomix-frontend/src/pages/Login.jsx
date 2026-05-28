import React from 'react';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined, DotChartOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const { Title, Text } = Typography;

const Login = ({ setGirisYapildi }) => {
    const navigate = useNavigate();

    const onFinish = async (values) => {
        message.loading({ content: 'Giriş yapılıyor...', key: 'loginState' });

        try {
            // ✅ AxiosInstance, withCredentials: true ayarıyla cookie'yi otomatik çeker
            const response = await axiosInstance.post('/auth/login', {
                username: values.username,
                password: values.password
            });

            localStorage.setItem('loomix_token', response.data.token);

            // Başarılı giriş
            message.success({
                content: response.data.mesaj || 'Hoş geldiniz, Ahmet!',
                key: 'loginState',
                duration: 2
            });

            setGirisYapildi(true);
            navigate('/');
        } catch (error) {
            console.error('Login Hatası:', error);
            // Backend'den gelen hata mesajını göster
            message.error({
                content: error.response?.data?.mesaj || 'Giriş yapılamadı! Backend bağlantısını kontrol edin.',
                key: 'loginState'
            });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            zIndex: 9999,
            display: 'flex',
            backgroundColor: '#0a192f',
            overflow: 'hidden'
        }}>
            {/* SOL PANEL */}
            <div style={{
                flex: 1.4,
                background: 'linear-gradient(135deg, #0a192f 0%, #172a45 100%)',
                display: window.innerWidth < 768 ? 'none' : 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                padding: '40px'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop")',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    opacity: 0.05, zIndex: 1
                }} />
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <DotChartOutlined style={{ fontSize: '72px', color: '#64ffda', marginBottom: '20px' }} />
                    <Title level={1} style={{ color: '#fff', fontSize: '48px', margin: 0 }}>LOOMIX ERP</Title>
                    <Title level={4} style={{ color: '#a8dadc', fontWeight: 'normal' }}>Dijital Geleceğe Giriş Yapın</Title>
                </div>
            </div>

            {/* SAĞ PANEL */}
            <div style={{
                flex: 1,
                backgroundColor: '#0a192f',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            }}>
                <div style={{
                    width: '90%', maxWidth: '400px',
                    padding: '40px',
                    background: 'rgba(23, 42, 69, 0.8)',
                    borderRadius: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(100, 255, 218, 0.2)',
                    zIndex: 2
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <Title level={2} style={{ color: '#fff', margin: 0 }}>Panel Girişi</Title>
                        <Text style={{ color: '#a8dadc' }}>Loomix ERP Veri Yönetim Sistemi</Text>
                    </div>

                    <Form layout="vertical" onFinish={onFinish}>
                        <Form.Item name="username" rules={[{ required: true, message: 'Kullanıcı adı girin!' }]}>
                            <Input prefix={<UserOutlined style={{ color: '#64ffda' }} />} placeholder="Kullanıcı Adı" size="large" style={{ borderRadius: '10px', height: '50px', background: 'rgba(10, 25, 47, 0.6)', color: '#fff', border: '1px solid rgba(100,255,218,0.2)' }} />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: 'Şifre girin!' }]}>
                            <Input.Password prefix={<LockOutlined style={{ color: '#64ffda' }} />} placeholder="Şifre" size="large" style={{ borderRadius: '10px', height: '50px', background: 'rgba(10, 25, 47, 0.6)', color: '#fff', border: '1px solid rgba(100,255,218,0.2)' }} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block style={{ background: 'linear-gradient(90deg, #64ffda 0%, #6c5ce7 100%)', border: 'none', height: '55px', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>
                            SİSTEME GİRİŞ <RocketOutlined />
                        </Button>
                        <Divider style={{ borderColor: 'rgba(100, 255, 218, 0.1)', color: '#a8dadc' }}>VEYA</Divider>
                        <div style={{ textAlign: 'center' }}>
                            <Link to="/register" style={{ color: '#64ffda', fontWeight: 'bold' }}>Yeni Personel Hesabı Oluştur</Link>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default Login;