class SimpleVue { // 简化版Vue实例的构造 用来接收实例的配置项
    constructor(options) {
        this.$el = document.querySelector(options.el);
        this.$data = options.data;
        this.$methods = options.methods;
        this.oWatcherObj = {}; // 所有属性值相关的数据对应的订阅器的集合都放在该对象中
        this.observe(); // 调用数据监听器对属性值相关的数据进行劫持并监听
        this.compile(this.$el); // 对该DOM节点进行解析
    }
    observe() { // 数据监听器 用来劫持并监听属性值相关数据的变化 如有变化则通知订阅器watcher
        for (let key in this.$data) {
            let value = this.$data[key];
            this.oWatcherObj[key] = []; // 初始化该数据的订阅器 数据和订阅器的关系是一对多
            let oWatcherObj = this.oWatcherObj[key];
            Object.defineProperty(this.$data, key, { // 关键方法 可以修改对象身上的默认属性值的ES5方法 下面用到的是ES中两大属性中的访问器属性,有以下四种描述符对象
                configurable: false, // 该状态下的属性描述符不能被修改和删除
                enumerable: false, // 该状态下的属性描述符中的属性不可被枚举
                get() { // 属性值相关的数据读取函数
                    return value;
                },
                set(newVal) { // 属性值相关的数据写入函数
                    if (newVal !== value) {
                        value = newVal;
                        oWatcherObj.forEach((obj) => {
                            obj.update(); // 通知和该数据相关的所有订阅器
                        });
                    }
                }
            });
        }
    }
    compile(el) { // 节点DOM解析器 用来获取和解析每一个节点及其指令 根据初始化的模板数据来创建订阅器watcher
        let nodes = el.children;
        for (let i = 0; i < nodes.length; i++) { // 迭代同级所有节点
            let node = nodes[i];
            if (node.children.length > 0) {
                this.compile(node); // 递归所有子节点
            }
            if (node.hasAttribute('yf-on:click')) { // 节点中如存在该指令则执行以下操作
                let eventAttrVal = node.getAttribute('yf-on:click');
                node.addEventListener('click', this.$methods[eventAttrVal].bind(this.$data)); // 绑定获取到的指令对应的数据所触发的方法
            }
            if (node.hasAttribute('yf-if')) {
                let ifAttrVal = node.getAttribute('yf-if');
                this.oWatcherObj[ifAttrVal].push(new Watcher(this, node, "", ifAttrVal)); // 给该指令对应的数据创建订阅器放在该数据对应的订阅器数组里
            }
            if (node.hasAttribute('yf-model')) {
                let modelAttrVal = node.getAttribute('yf-model');
                node.addEventListener('input', ((i) => { // 前方高能:此处有闭包请绕行!!! i的问题
                    this.oWatcherObj[modelAttrVal].push(new Watcher(this, node, "value", modelAttrVal));
                    return () => {
                        this.$data[modelAttrVal] = nodes[i].value; // 将该指令所在节点的值扔给该指令的数据
                    }
                })(i));
            }
            if (node.hasAttribute('yf-text')) {
                let textAttrVal = node.getAttribute('yf-text');
                this.oWatcherObj[textAttrVal].push(new Watcher(this, node, "innerText", textAttrVal));
            }
        }
    }
}
class Watcher { // 订阅器构造 用来接收属性值的相关数据的变化通知 从而更新视图
    constructor(...arg) {
        this.vm = arg[0];
        this.el = arg[1];
        this.attr = arg[2];
        this.val = arg[3];
        this.update(); // 初始化订阅器时更新一下视图
    }
    update() { // 将收到的新的数据更新在视图中从而实现真正的VM
        if (this.vm.$data[this.val] === true) {
            this.el.style.display = 'block';
        } else if (this.vm.$data[this.val] === false) {
            this.el.style.display = 'none';
        } else {
            this.el[this.attr] = this.vm.$data[this.val];
        }
    }
}
