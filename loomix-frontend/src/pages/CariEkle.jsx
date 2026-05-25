import React from 'react';
import { Form, Input, Button, Row, Col, Card, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { addCari } from "../api/cariService.js";


const CariKarti = () => {
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        try {
            console.log("Gönderilecek Mikro Uyumlu Veri:", values);

            // Senin kendi yazdığın API fonksiyonunu çağırıyoruz:
            const res = await addCari(values);

            alert("Cari başarıyla eklendi!");
            form.resetFields(); // Başarılı olunca formu temizle
        } catch (error) {
            console.error("Hata:", error);
            alert("Eklerken bir hata oluştu!");
        }
    };
    return (
        <Card title="Cari Tanıtım Kartı " variant="borderless" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                // Mikro'daki gibi kompakt bir görünüm için:
                size="middle"
            >
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label="Cari Kodu" name="cariKodu" rules={[{ required: true, message: 'Cari Kodu zorunludur!' }]}>
                            <Input placeholder="Örn: 120.01.001" style={{ fontWeight: 'bold' }} />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item label="Ünvanı (Firma Adı)" name="firmaAdi" rules={[{ required: true, message: 'Firma adı zorunludur!' }]}>
                            <Input placeholder="Tam ticari ünvanı giriniz" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider dashed style={{ margin: '12px 0' }} />

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Vergi Dairesi" name="vergiDairesi">
                            <Input placeholder="Örn: Isparta V.D." />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Vergi/TC Kimlik No" name="vergiNo">
                            <Input placeholder="10 veya 11 haneli numara" maxLength={11} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Telefon" name="telefon">
                            <Input placeholder="0(5XX) XXX XX XX" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="E-Posta" name="email">
                            <Input placeholder="ornek@firma.com" type="email" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item label="Açık Adres" name="adres">
                            <Input.TextArea rows={2} placeholder="Firma tam adresi..." />
                        </Form.Item>
                    </Col>
                </Row>

                <Row justify="end">
                    <Col>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
                            Cari Kartı Kaydet (F10)
                        </Button>
                    </Col>
                </Row>
            </Form>
        </Card>
    );
};

export default CariKarti;    