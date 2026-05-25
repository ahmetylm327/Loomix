import React from 'react';
import { InputNumber } from 'antd';

const ParaInput = (props) => {
    return (
        <InputNumber
            {...props}
            style={{ width: '100%', ...props.style }}
            // 1.000,00 formatı için düzenleme
            formatter={(value) => `${value}`.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            // Giriş yaparken virgülü noktaya çevirerek veritabanı formatına getirme
            parser={(value) => value.replace(/\./g, '').replace(',', '.')}
        />
    );
};

export default ParaInput;