import React from 'react';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined, DotChartOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';


const { Title, Text } = Typography;

const Login = () => {
    const navigate = useNavigate();

    // 🚀 Backend API Adresi (Canlıya geçince burayı Render linkinle değiştireceksin)

    const BASE_URL = "https://loomix-xlp4.onrender.com/api";

    const onFinish = async (values) => {
        message.loading({ content: 'Giriş yapılıyor...', key: 'loginState' });

        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Backend'in beklediği: { username, password }
                body: JSON.stringify({
                    username: values.username,
                    password: values.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 🔑 Token'ı tarayıcıya kaydet (Sistem seni tanısın)
                localStorage.setItem('loomix_token', data.token);

                message.success({
                    content: data.mesaj || 'Hoş geldiniz, Ahmet!',
                    key: 'loginState',
                    duration: 2
                });

                // ✅ Giriş başarılı, Dashboard'a yönlendir
                navigate('/');
            } else {
                // Hatalı şifre veya kullanıcı adı mesajını backend'den alıyoruz
                message.error({
                    content: data.mesaj || 'Kimlik bilgileri hatalı!',
                    key: 'loginState'
                });
            }
        } catch (error) {
            console.error('Login Hatası:', error);
            message.error({
                content: 'Sunucuya bağlanılamadı! Backend açık mı?',
                key: 'loginState'
            });
        }
    };

    return (
        /* 🛡️ ZIRHLI DIŞ KATMAN: Ekrandaki tüm boşlukları (siyahlıkları) kapatır */
        <div style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            zIndex: 9999,
            display: 'flex',
            backgroundColor: '#0a192f',
            overflow: 'hidden'
        }}>
            {/* SOL PANEL: Görsel ve Başlık */}
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
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.05,
                    zIndex: 1
                }} />
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <DotChartOutlined style={{ fontSize: '72px', color: '#64ffda', marginBottom: '20px' }} />
                    <Title level={1} style={{ color: '#fff', fontSize: '48px', margin: 0 }}>LOOMIX ERP</Title>
                    <Title level={4} style={{ color: '#a8dadc', fontWeight: 'normal' }}>Dijital Geleceğe Giriş Yapın</Title>
                </div>
            </div>

            {/* SAĞ PANEL: Giriş Formu */}
            <div style={{
                flex: 1,
                backgroundColor: '#0a192f',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            }}>
                <div style={{
                    width: '90%',
                    maxWidth: '400px',
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
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: 'Lütfen kullanıcı adınızı girin!' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#64ffda' }} />}
                                placeholder="Kullanıcı Adı"
                                size="large"
                                style={{
                                    borderRadius: '10px', height: '50px',
                                    background: 'rgba(10, 25, 47, 0.6)',
                                    color: '#fff', border: '1px solid rgba(100,255,218,0.2)'
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Lütfen şifrenizi girin!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#64ffda' }} />}
                                placeholder="Şifre"
                                size="large"
                                style={{
                                    borderRadius: '10px', height: '50px',
                                    background: 'rgba(10, 25, 47, 0.6)',
                                    color: '#fff', border: '1px solid rgba(100,255,218,0.2)'
                                }}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                style={{
                                    background: 'linear-gradient(90deg, #64ffda 0%, #6c5ce7 100%)',
                                    border: 'none', height: '55px', borderRadius: '10px',
                                    fontWeight: 'bold', fontSize: '18px', color: '#fff'
                                }}
                            >
                                SİSTEME GİRİŞ <RocketOutlined />
                            </Button>
                        </Form.Item>

                        <Divider style={{ borderColor: 'rgba(100, 255, 218, 0.1)', color: '#a8dadc' }}>VEYA</Divider>

                        <div style={{ textAlign: 'center' }}>
                            <Text style={{ color: '#a8dadc' }}>Sistemde kayıtlı değil misiniz?</Text>
                            <br />
                            <Link to="/register" style={{ color: '#64ffda', fontWeight: 'bold' }}>
                                Yeni Personel Hesabı Oluştur
                            </Link>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default Login;