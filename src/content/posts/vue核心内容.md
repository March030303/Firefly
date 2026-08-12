---
title: 初步了解Vue
published: 2026-08-05
description: 记录下这半个月学到的Vue知识（自用）
tags:
  - 前端
  - vue
category: 学习笔记
slug: vue-study
images: images/
date updated: 2026-08-07 18:23
---

# Vue2语法

## 数据写法

```
export default {


  name: 'HelloWorld',

  //组件通信

  //父组件向子组件传值:props

  props: {

    msg: String

  },
  
  data(){
  return{
	   title : '静夜思',

                content : '这是内容<span>span</span>',

                arr:['a','b','c','d'],

                obj:{

                   a:1,

                   b:2,

                   c:3  
					
                },

                bool:true,

                inputValue:'默认'
	  }
  }

}
```
## 插值表达式
{{}}

## 指令

#### v-if和v-show
区别是：bool为false时前者销毁标签，后者隐藏标签
```
        <p v-if="bool">这是内容</p>
        <p v-show="bool">这是内容</p>
```
```
```
#### v-on 
下面两者一样
```
<button v-on:click="output">点击我</button>

<button @click="output">点击我</button>
         
```
 #### v-for 
 常用来遍历，放在li
 其中key是唯一值，可以是id，如果不写就是索引值（0，1，2），item只是个名字，list可以是data或者props里的数据名
 ```
<li v-for="item in list" :key="item.id">{{ item.name }}--{{ item.age }}</li>
 ```
 
 #### v-model
  表单指令，可以实现双向绑定 
```
         <input type="text" v-model="inputValue"></input>

         <p>{{inputValue}}</p>
```
         
#### v-bind
也就是:（这两行等价）         

```
<p v-bind:title="title">喵喵喵</p>

<p :title="title">喵喵喵</p>
```
# Vue3语法
## setup

- setup`函数返回的对象中的内容，可直接在模板中使用。
- `setup`中访问`this`是`undefined`。
- `setup`函数会在`beforeCreate`之前调用，它是“领先”所有钩子执行的。

原始写法：
```

<script lang="ts">
  export default {
    name:'Person',
    setup(){
      // 数据，原来写在data中（注意：此时的name、age、tel数据都不是响应式数据）
      let name = '张三'
      let age = 18
      let tel = '13888888888'

      // 方法，原来写在methods中
      function changeName(){
        name = 'zhang-san' //注意：此时这么修改name页面是不变化的
        console.log(name)
      }
      function changeAge(){
        age += 1 //注意：此时这么修改age页面是不变化的
        console.log(age)
      }
      function showTel(){
        alert(tel)
      }

      // 返回一个对象，对象中的内容，模板中可以直接使用
      return {name,age,tel,changeName,changeAge,showTel}
    }
  }
</script>
```

语法糖写法：<script setup lang="ts"></script>这个语法糖可以自动把export default、return都完成

不过这样的话组件名就改不了了（组件名此时和文件名相同）
```
```vue
<script setup lang="ts">
  console.log(this) //undefined
  
  // 数据（注意：此时的name、age、tel都不是响应式数据）
  let name = '张三'
  let age = 18
  let tel = '13888888888'

  // 方法
  function changName(){
    name = '李四'//注意：此时这么修改name页面是不变化的
  }
  function changAge(){
    console.log(age)
    age += 1 //注意：此时这么修改age页面是不变化的
  }
  function showTel(){
    alert(tel)
  }
</script>
```

```
<script setup lang="ts">

import Person from './components/Person.vue'

import HelloWorld from './components/HelloWorld.vue'

import TheWelcome from './components/TheWelcome.vue'

</script>
```

## ref和reactive

### ref用于基本数据类型

- **作用：** 定义响应式变量。
- **语法：**`let xxx = ref(初始值)`。
- **返回值：** 一个`RefImpl`的实例对象，简称`ref对象`或`ref`，`ref`对象的`value`**属性是响应式的**
- **注意点：**
    - `JS`中操作数据需要：`xxx.value`，但模板中不需要`.value`，直接使用即可。
    - 对于`let name = ref('张三')`来说，`name`不是响应式的，`name.value`是响应式的。
    - 如果是reactive(a:ref(3))，直接.a就可以了（不用.value）
### reactive用于引用数据类型
- **作用：**定义一个**响应式对象**（基本类型不要用它，要用`ref`，否则报错）
- **语法：**`let 响应式对象= reactive(源对象)`。
- **返回值：**一个`Proxy`的实例对象，简称：响应式对象。
- **注意点：**`reactive`定义的响应式数据是“深层次”的。

### torefs和toref

[1]直接解构 reactive 对象得到的变量是普通原始值，丢失响应式，和原对象不再联动；
let {name,age}=person

[2]通过 toRefs 解构得到的变量是 Ref，保持响应式，双向同步。
let {name,age}=torefs(person)

### ref的标签属性
场景：子与父万一有某个标签id相同，呈现内容会混乱，此时可以用ref标签来操作

1、用在普通`DOM`标签上，获取的是`DOM`节点。
```
<template>
  <div class="person">
    <h1 ref="title1">尚硅谷</h1>//第一步：这里用ref标签
    <h2 ref="title2">前端</h2>
    <h3 ref="title3">Vue</h3>
    <input type="text" ref="inpt"> <br><br>
    <button @click="showLog">点我打印内容</button>
  </div>
</template>

<script lang="ts" setup name="Person">
  import {ref} from 'vue'//引入
	
  let title1 = ref()     //第二步：使其为空ref
  let title2 = ref()
  let title3 = ref()

  function showLog(){
		
    //第三步： 通过ref获取元素
    console.log(title1.value)
    console.log(title2.value)
    console.log(title3.value)
  }
</script>
```

2、用在组件标签上，获取的是组件实例对象。但如果组件没有暴露数据，父在用组件标签时是看不到数据的
```
<!-- 父组件App.vue -->
<template>
  <Person ref="ren"/>
  <button @click="test">测试</button>
</template>

<script lang="ts" setup name="App">
  import Person from './components/Person.vue'
  import {ref} from 'vue'

  let ren = ref()

  function test(){
    console.log(ren.value.name)
    console.log(ren.value.age)
  }
</script>


<!-- 子组件Person.vue中要使用defineExpose暴露内容 -->
<script lang="ts" setup name="Person">
  import {ref,defineExpose} from 'vue'
	// 数据
  let name = ref('张三')
  let age = ref(18)
  
  /****************************/
  // 使用defineExpose将组件中的数据交给外部
  defineExpose({name,age})
</script>
```
## 计算属性

1、和vue2类似，计算属性具有缓存性
2、可以只读，也可以修改（set）
```
<template>
  <div class="person">
    姓：<input type="text" v-model="firstName"> <br>
    名：<input type="text" v-model="lastName"> <br>
    全名：<span>{{fullName}}</span> <br>
    <button @click="changeFullName">全名改为：li-si</button>
  </div>
</template>

<script setup lang="ts" name="App">
  import {ref,computed} from 'vue'

  let firstName = ref('zhang')
  let lastName = ref('san')

  // 计算属性——只读取，不修改
  /* let fullName = computed(()=>{
    return firstName.value + '-' + lastName.value
  }) */


  // 计算属性——既读取又修改
  let fullName = computed({
    // 读取
    get(){
      return firstName.value + '-' + lastName.value
    },
    // 修改
    set(val){        //这个参数是下面的"li-si"
     const [str1,str2] = val.split("-")
     firstname.value = str1
     lastname.value = str2
     
    }
  })

  function changeFullName(){
    fullName.value = 'li-si'
  } 
</script>
```

## watch

- 作用：监视数据的变化（和`Vue2`中的`watch`作用一致）
- 特点：`Vue3`中的`watch`只能监视以下**四种数据**：
    
    > 1. `ref`定义的数据。
    > 2. `reactive`定义的数据。
    > 3. 函数返回一个值（`getter`函数）。
    > 4. 一个包含上述内容的数组。

基本语法:watch（要监视的对象，回调函数）
```vue
 const stopWatch = watch(sum,(newValue,oldValue)=>{
    console.log('sum变化了',newValue,oldValue)
    if(newValue >= 10){
      stopWatch()
    }
  }
```
![[Pasted image 20260810020542.png]]

## Typescript约束对象属性

```
//定义一个接口，限制

export interface Person{

id:string,

name:string,

age:number

x?:number//可有可无的

}

下面两种写法等价，随便选一种即可

//export type Persons = Array<Person>

export type Persons = Person[]
```

与组件同级的文件夹types里创建该接口
![[Pasted image 20260809162458.png]]


组件文件导入后，在组件里写的数据都要遵循此规范

## props

与vue2类似，props用于父传子

前情提要：“父”有一组数据，这组数据的规范是符合上面ts规定的规范的，要将这些数据传给子（数组名叫parentlist的话。当然了，组件标签会有:list="parentlist"）。至此，只需要研究子的props设置

```vue
// 第一种写法：仅接收
const props = defineProps(['list'])
  
// 第二种写法：接收+限制类型
defineProps<{list:Persons}>()

//第三种写法：接收+限制类型+限制必要性
defineProps<{list?:Persons}>()

  
// 第四种写法：接收+限制类型+指定默认值+限制必要性（要引入withDefaults）
let props = withDefaults(defineProps<{list?:Persons}>(),{
     list:()=>[{id:'asdasg01',name:'小猪佩奇',age:18}]   //这是个函数
  })
```

## hooks

模块=数据＋函数，为了让项目模块化，可以用hooks把有关联的数据和函数关联在一起
1、首先把原组件里与“数字”、“狗”相关的全都模块化写入hooks文件夹的useSum.ts、useDog.ts，最后记得return向外提供数据和函数

2、这里贴出Person组件使用这两个模块的方法

```
<script setup lang="ts" name = "Person">
  import useSum from '@/hooks/useSum'
  import useDog from '@/hooks/useDog'
	
  let {sum,increment,decrement} = useSum()
  let {dogList,getDog} = useDog()
</script>
```


# 组件开发

大概的印象：
==父组件==和==子组件==之间可以相互传值，叫做==组件通信==
通过v-slot可以进行==组件插槽==

## 组件通信
### 父=>子 

1、没有router时，先在hello组件加上props
![[Pasted image 20260808184325.png|374]]
```

  name: 'HelloWorld',

  //组件通信

  //父组件向子组件传值:props

  props: {

    msg: String
    
    name: String,

    age: Number,

    count:{

      type:[String,Number],

      default:0

    }

  }

}
```

再在APP.vue中引入这个标签
```<div id="app">

    <img alt="Vue logo" src="./assets/logo.png">

    <HelloWorld msg="Welcome to Your Vue.js App" :name="name" :age="age" >你的姓名是{{name}}年龄是{{ age }}</HelloWorld>

  </div>
```


关于在“向子组件传数据”这件事，有两种写法：
[1]、组件通信：在上面的app文件代码中有v-bind，可以在下面data里动态变化name和age，那么这时：子组件props加上这两个变量，再手动在p标签里面{{name}}、{{age}}这样呈现
[2]、组件插槽：直接在app的hello标签先内容，再在子组件中搞一个空的slot就可以了（默认插槽）

最重要的，是要知道：子组件在p标签自己写的话，数据找的是自己的props。插槽的话，找的是父组件的data
### 子=>父
一般步骤
[1]、子组件建一个按钮，点击绑定函数childhandle，再在this.$emit传给父组件。
```methods:{

    childhandler(){
    {

    this.childcount=this.childcount1+this.childcount2

    this.$emit('child-count',this.childcount)

   }

  }
```
[2]、父组件再   @这个名字=自己写的函数名字  ，在自己的函数完成想要的操作
```    <HelloWorld msg="Welcome to Your Vue.js App" :name="name" :age="age"  count="parentcount" 

@child-count="handle"//右边是自己的函数handle,它会接到一个数据（参数）————子组件传的值(也就是下面的参数count，名字是啥无所谓，总之实际上就是子中的this.childcount)

>你的姓名是{{name}}年龄是{{ age }}count值是:{{ parentcount }}</HelloWorld>
```


```methods:{

    handle(count){

      this.parentcount=count

    }

  }
```


## 组件插槽


### 默认插槽

直接在app的hello标签先内容，再在子组件中搞一个空的slot就可以了（默认插槽）
```
    <HelloWorld msg="Welcome to Your Vue.js App" :name="name" :age="age"  count="parentcount" @child-count="handle">
    
    你的姓名是{{name}}年龄是{{ age }}count值是:{{ parentcount }}
    //这里就是插槽内容（在app中）
    
    </HelloWorld>
```
 
```
<div class="hello">

    <h1>{{ msg }}</h1>

    <slot>默认内容</slot>//插在这里（如果“父”没内容，显示默认内容。如果有，显示“父”的内容）

    <p>姓名：{{name}},年龄:{{ age }},count:{{ count }}</p>

      <button @click="childhandler">按钮</button>

  </div>
```

### 具名插槽
子组件先定义一个取了名的slot
```
<div class="hello">

    <h1>{{ msg }}</h1>

    <slot>默认内容</slot>//插在这里（如果“父”没内容，显示默认内容。如果有，显示“父”的内容）

    <p>姓名：{{name}},年龄:{{ age }},count:{{ count }}</p>

      <button @click="childhandler">按钮</button>
      
      
            <slot name="footer">footer默认内容</slot>//这里取名

  </div>
```

```
<HelloWorld

    msg="Welcome to Your Vue.js App"

    :name="name"

    :age="age"  

    count="parentcount"

    @child-count="handle">

    你的姓名是{{name}}年龄是{{ age }}count值是:{{ parentcount }}

  <template v-slot:footer>第一个footer</template>//这里插槽

  </HelloWorld>

```

这两种写法一样的
```
<template v-slot:footer>第一个footer</template>//这里插槽
<template #footer>第一个footer</template>
```

### 作用域插槽
场景：父组件在插槽时想拿到子组件（data里的）的一些数据

[1]、先在子组件v-bind一些想往上传的数据，这里选择count属性（复习：childcount变量会从data找到1，最后得到对象{count:1}，往上传

```
	
	
	      <slot name="footer2" :count="childcount" :counting="childcount1">footer2默认内容</slot>
	      .
	      .
	      .
	      .
	      .
	      .
	      data(){
    return {
      childcount:1
      childcount1:2
    }
  }

```
[2]、父组件拿到数据
```  
<template #footer2="{count,counting}">第二个footer,{{ count }},{{counting}}</template>
```

[3]、如果觉得传的变量有点多，可以提前在子组件写一个
```
<!-- 子组件：把所有值打包成一个对象 -->
<slot name="footer2" :obj="{ count: childcount, counting: childcount1 }">

<!-- 父组件：只用解构一个 obj，里面啥都有 -->
<template #footer2="{ obj }">
  {{ obj.count }}, {{ obj.counting }}
</template>
```

# 路由
## 基本切换效果


1、导航区=>展示区：在App.vue中自己写好两个区域

2、请求路由器
3、指定具体的规则（这样，路由器可以通过path，找到组件）

注意:routes为数组，存放一个一个route(name,path,component)
```
//引入创建路由器

import { createRouter, createWebHashHistory } from 'vue-router'

//引入要呈现的组件

import Home from '@/components/Home.vue'

import News from '@/components/News.vue'

import About from '@/components/About.vue'

const router = createRouter({

history:createWebHashHistory(),//路由器的工作模式

routes:[

    {
    name:"zhuye"
    
    path:'/home',

     component:Home

    },

    {path:'/news',

     component:News

    },

    {
    name:'guanyu'
    
    path:'/about',

    component:About

    }

]

})

//暴露路由器

export default router
```

4、形成一个个？？？.vue：写展示区具体要展示什么界面

5、再告诉路由器组件该放哪里（引入RouterView）
6、实现点击导航栏跳转展示（引入RouterLink）：to属性写路由地址、active-class写动态样式
```
<template>

  <div class="app">

    <h2 class="title">Vue路由测试</h2>

    <!-- 导航区 -->

    <div class="navigate">
    
    //这里to有三种写法（1字符串写法+2对象写法）：

      <RouterLink to="/home" active-class="xiaozhupeiqi">首页</RouterLink>

     <RouterLink :to="{path:'/news'}" active-class="xiaozhupeiqi">新闻</RouterLink>

      <RouterLink:to="{name:'/guanyu'}" active-class="xiaozhupeiqi">关于</RouterLink>

    </div>

    <!-- 展示区 -->

    <div class="main-content">

      <RouterView></RouterView>//让路由器把组件放在这

    </div>

  </div>

</template>

  

<script lang="ts" setup name="App">

  import {RouterView,RouterLink} from 'vue-router'

  

</script>
```

注意：
1. ==路由组件（靠路由规则渲染出来的）==通常存放在`pages` 或 `views`文件夹，一般组件通常存放在`components`文件夹。
    
2. 通过点击导航，视觉效果上“消失” 了的路由组件，默认是被**卸载**掉的，需要的时候再去**挂载**。（从a切到b，a被卸载了，需要再挂载）

## 路由器工作模式
`history`模式

> 优点：`URL`更加美观，不带有`#`，更接近传统的网站`URL`。
> 
> 缺点：后期项目上线，需要服务端配合处理路径问题，否则刷新会有`404`错误。


```
const router = createRouter({
  	history:createWebHistory(), //history模式
  	/******/
})
```




`hash`模式

> 优点：兼容性更好，因为不需要服务器端处理路径。
> 
> 缺点：`URL`带有`#`不太美观，且在`SEO`优化方面相对较差。


> ```
> const router = createRouter({
  	history:createWebHashHistory(), //hash模式
  	/******/
})
> ```

## 嵌套路由

场景：点击导航栏“新闻”，跳转页面后，希望在这个页面也设计导航=>展示

1. 编写`News`的子路由：`Detail.vue`
    
2. 配置路由规则，使用`children`配置项：
```
.
.
.
   ```ts
{
			name:'xinwen',
			path:'/news',
			component:News,
			children:[
				{
					name:'xiang',
					path:'detail',//这里不用“/”
					component:Detail
				}
			]
		}
.
.
.

```
3、再在news设置link跳转
```
<router-link to="/news/detail">xxxx</router-link>
<!-- 或 -->
<router-link :to="{path:'/news/detail'}">xxxx</router-link>
```
4、记得要展示，设置routerview

## 路由传参

### query

### params

# Pinia

## 前置步骤：
1. npm i pinia
2. 在main.ts引入与使用
```
import { createPinia } from 'pinia'
const pinia = createPinia()
app.use(pinia)
```

## 使用步骤
