// 测试 /api/mvs/submit 接口
const http = require('http');

const testData = {
    "问题信息": {
        "工单编号": "HL2025007724",
        "问题概要": "应用连接数据库服务器超时",
        "问题描述": "<p>\n\t<img width=\"300px\" src=\"https://bucket-mvs.oss-cn-beijing.aliyuncs.com/1745202336uploads20250421\" alt=\"\" />\n</p>\n<p>\n\t附件为排查的基本情况。\n</p>",
        "附件": [
            "https://bucket-mvs.oss-cn-beijing.aliyuncs.com/order/20250421/02536842/超时.docx"
        ]
    },
    "客户信息": {
        "公司名称": "海量数据ApolloDB团队",
        "客户级别": "一般客户",
        "是否TOP客户": "否",
        "客户经理": "林根"
    },
    "工程师信息": {
        "工程师姓名": "张希顺",
        "工程师邮箱": "zhangxs@vastdata.com.cn"
    },
    "产品信息": {
        "产品版本": "Vastbase G1002.2 Build 10",
        "模块": "其它性能问题",
        "硬件平台": "Intel X86_64",
        "操作系统": "Kylin Linux / V10 SP3",
        "部署方式": "集群部署"
    }
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/mvs/submit',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('响应体:');
        console.log(JSON.parse(data));
        
        if (res.statusCode === 200) {
            const response = JSON.parse(data);
            console.log('\n测试结果:');
            console.log(`- 工单提交成功: ${response.success}`);
            console.log(`- 会话ID: ${response.sessionId}`);
            console.log(`- 工程师姓名: ${response.engineerName}`);
            console.log(`- 附件数量: ${response.attachmentCount}`);
            console.log(`- 已上传数量: ${response.uploadedCount}`);
            
            if (response.uploadedCount > 0) {
                console.log('✓ 附件已成功下载并上传到Dify');
            } else {
                console.log('⚠️ 附件处理可能失败或没有附件');
            }
        } else {
            console.log('❌ 工单提交失败');
        }
    });
});

req.on('error', (e) => {
    console.error(`请求遇到问题: ${e.message}`);
});

req.write(postData);
req.end();