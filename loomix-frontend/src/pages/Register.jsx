import React from 'react';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserAddOutlined, LockOutlined, RocketOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';

const { Title, Text } = Typography;

const Register = () => {
    const navigate = useNavigate();

    // 🚀 API ADRESİ: Bilgisayarda localhost, canlıda Render linki
    const BASE_URL = "https://loomix-xlp4.onrender.com/api";

    const onFinish = async (values) => {
        message.loading({ content: 'Hesabınız oluşturuluyor...', key: 'regState' });

        try {
            const response = await fetch(`${BASE_URL}/kayit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // ⚠️ DİKKAT: Backend'deki authController 'kullaniciAdi' ve 'sifre' bekliyor!
                body: JSON.stringify({
                    kullaniciAdi: values.username,
                    sifre: values.password,
                    rol: 'admin' // Varsayılan rol
                }),
            });

            const data = await response.json();

            if (response.ok) {
                message.success({ content: 'Kayıt Başarılı! Giriş yapabilirsiniz.', key: 'regState', duration: 3 });
                navigate('/login'); // Kayıt bitince Login'e uçur
            } else {
                message.error({ content: data.mesaj || 'Kayıt başarısız!', key: 'regState' });
            }
        } catch (error) {
            console.error('Kayıt Hatası:', error);
            message.error({ content: 'Sunucuya bağlanılamadı!', key: 'regState' });
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#0a192f', zIndex: 9999
        }}>
            <div style={{
                width: '90%', maxWidth: '400px', padding: '40px',
                background: 'rgba(23, 42, 69, 0.9)', borderRadius: '20px',
                border: '1px solid rgba(100, 255, 218, 0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <UserAddOutlined style={{ fontSize: '50px', color: '#64ffda', marginBottom: '15px' }} />
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>Yeni Hesap</Title>
                    <Text style={{ color: '#a8dadc' }}>Loomix ERP Personel Kayıt Sistemi</Text>
                </div>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item name="username" rules={[{ required: true, message: 'Kullanıcı adı gerekli!' }]}>
                        <Input prefix={<LockOutlined />} placeholder="Kullanıcı Adı" size="large" />
                    </Form.Item>

                    <Form.Item name="password" rules={[{ required: true, message: 'Şifre gerekli!' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Şifre" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block style={{
                            background: 'linear-gradient(90deg, #64ffda 0%, #6c5ce7 100%)', height: '50px', fontWeight: 'bold'
                        }}>
                            HESAP OLUŞTUR <RocketOutlined />
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <Link to="/login" style={{ color: '#64ffda' }}><ArrowLeftOutlined /> Giriş Sayfasına Dön</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;