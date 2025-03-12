// transactionTypes.js
// 交易类型定义
export const TransactionType = {
    LegacyTx: 0,
    Eip2930: 1,
    Eip1559: 2,
    Eip4844: 3
};

// 扩展功能
export const TransactionTypeUtils = {
    getName(type) {
        const nameMap = {
            [TransactionType.LegacyTx]: 'Legacy Transaction',
            [TransactionType.Eip2930]: 'EIP-2930 Transaction',
            [TransactionType.Eip1559]: 'EIP-1559 Transaction',
            [TransactionType.Eip4844]: 'EIP-4844 Transaction'
        };
        return nameMap[type] || 'Unknown Transaction Type';
    },

    isSupported(type) {
        return Object.values(TransactionType).includes(type);
    }
};

// 使用示例
/*
import { TransactionType, TransactionTypeUtils } from './transactionTypes';

console.log(TransactionTypeUtils.getName(TransactionType.Eip1559))
*/
