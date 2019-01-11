# simpleVue
一个简化版的Vue的demo教你Vue的实现原理是怎样的
好多人看完我的[这个文章](https://www.jianshu.com/p/23180880d3aa)对它的理解还是只是知道了大概原理，但是对具体的Vue双向绑定的实现很模糊，因此就出了这篇文章，供大家参考希望可以得到收获，以下是主要代码逻辑，先陈述一下这一过程都需要什么：

需要有一个接收Vue实例配置项的构造函数SimpleVue，给他加两个原型方法分别是observe()和compile()，再构造出一个订阅器watcher，给他加一个更新视图方法
> * observe()：用来劫持并监听数据变化的数据监听器，有变化就会通知下文中的订阅器watcher
> * compile()：节点DOM解析器，用来获取和解析每一个节点及其指令，根据初始化的模板数据来创建订阅器watcher
> * watcher()：订阅器watcher，用来接收属性值的相关数据的变化通知，调用自身原型方法update从而更新视图

由于Vue就是一个MVVM的框架理念，所以就要通过`Object.defineProperty()`方法来劫持并监听所有属性值相关的数据，看看它是否变化，如有变化则通知订阅器watcher看是否需要视图更新，这一过程就是我们的数据监听器`observe`的工作任务，由于数据和订阅器是一对多的关系，所以通知订阅器的时候需要把数据对应的订阅器的集合都放在一个`oWatcherObj`对象中，接下来需要一个节点DOM解析器`compile`，主要用来迭代递归获取和解析每一个节点及其指令，根据初始化的模板数据来创建订阅器`watcher`，实例化watcher就会接到数据变化的通知，进而实现VM更新视图

template：
```
<div id="simpleVue">
    <button yf-on:click="copy">戳我</button>
    <div>
        <textarea yf-model="name"></textarea>
        <div yf-text="name"></div>
    </div>
    <hr>
    <button yf-on:click="show">显示/隐藏</button>
    <div yf-if="isShow">
        <input type="text" yf-model="webSite">
        <div yf-text="webSite"></div>
    </div>
</div>
```
SimpleVue构造：
```
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
```
订阅器构造：
```
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
```
[戳我运行代码](https://yufy1314.github.io/simpleVue/)

希望大家阅读完本文可以有所收获，因为能力有限，掌握的知识也是不够全面，欢迎大家提出来一起分享！谢谢O(∩_∩)O~

欢迎访问**[我的GitHub](https://github.com/YuFy1314)**，喜欢的可以star，项目随意fork，支持转载但要下标注，同时恭候：**[个人博客](https://yufy1314.github.io/)**
