---
title: java基本语法
published: 2026-07-27T10:00:00
description: "大一下学习的Java课程内容"
tags: ["后端", "大学课程"]
category: 学习笔记
slug: java-study
---

# <center>类型转换
## 1、自动类型转换
当把一个较小范围的类型赋值给一个较大范围的类型时，发生自动类型转换。
形式：
```
byte a1=2; 
byte a2=3; 
byte a=a1+a2;//错误
int a=a1+a2;//正确
```
<span style="color:red">注意：
1、表达式中，如果有一个变量是较大范围的类型，表达式的类型就是较大范围的类型。
2、a+=b等价于a=(a的类型)（a+b）</span>
## 2、强制类型转换
当把一个较大范围的类型赋值给一个较小范围的类型时，发生强制类型转换。
形式：数据类型 变量=(数据类型)变量
例子：
```
double a=2.5; 
int b=(int)a;
```
# <center>数组
## 数组的定义
### 1、静态数组
```

int[] arr3=new int[]{1,2,3};//方式一：声明、分配空间并赋值

int[] arr4={1,2,3};//方式一的语法糖
```
### 2、动态数组
```
int[] arr1=new int[10];//方式一：声明并分配空间

int[] arr2;//方式二：声明、分配空间
arr2=new int[10];//不赋值
```

### 3、数组的操作
 1、长度:arr.length()
 2、赋值:arr[i]=value
 3、取值:value=arr[i]
 4、直接==数组名.for==即可在idea遍历

 其实有时候不需要把所有数据存在数组中，如果是==找最大最小、求和==类似的问题，完全能用临时变量计算

# <center>类
这一章的基础概念、规则很多，需要重点理解。

类由 ==“成员变量”+“构造器”+“方法”+“代码块”+“内部类”== 五部分组成
### <center>成员变量
#### 成员变量声明
成员变量声明的格式：
```
class StudentExtended{
    private long studentID;
    private int classID;
    private String name;
    private String sex;
    private int age;
}
```
还要注意，声明和赋值一起进行是可以的，分开就不行了
```
class Student {
    int x=10;     //可以的
}
```
```
class Student {
    int x;
    x=10;        //不可以
}
```
成员变量分为 ==“类变量”和“实例变量”== 两种，成员变量是有默认值的（局部变量没有默认值）

成员变量默认值的规则：整型是0，浮点型是0.0，引用类型 null，布尔型是false
##### 类变量
static修饰，通常用==类名而不是对象名==来访问

##### 实例变量
就是普通的那种

```java
class Student {
    // 实例变量：每个学生有自己的姓名和分数
    String name;
    int score;
    
    // 类变量：统计总共创建了多少个学生对象
    static int studentCount = 0;
    
    // 构造器
    public Student(String name, int score) {
        this.name = name;
        this.score = score;
        studentCount++;   // 每 new 一个对象，计数加1，共享同一个 studentCount
    }
    
    // 实例方法：显示当前学生的信息
    public void showInfo() {
        System.out.println("姓名：" + name + "，分数：" + score);
    }
    
    // 类方法（静态方法）：显示总共的学生人数
    public static void showTotalCount() {
        System.out.println("学生总人数：" + studentCount);
        // 注意：静态方法不能直接访问实例变量 name、score（需要对象）
    }
}

public class TestStatic {
    public static void main(String[] args) {
        Student.showTotalCount();   // 输出：学生总人数：0（还没创建对象）
        
        Student s1 = new Student("张三", 85);
        Student s2 = new Student("李四", 92);
        
        s1.showInfo();      // 姓名：张三，分数：85
        s2.showInfo();      // 姓名：李四，分数：92
        
        // 两种访问类变量的方式
        System.out.println("通过类名访问：" + Student.studentCount);  // 推荐
        System.out.println("通过对象访问：" + s1.studentCount);        // 不推荐但可以，输出仍是2
    }
}
```

### <center>构造器
1）名字必须和类名相同
2）任何类写出来自带一个无参数构造器，写不写都有，我们常说的new一个对象就是通过构造器实现的

==**作用**==：初始化一个类的对象，并返回这个对象的地址。

==**分类**==：
1）==无参数构造器==：初始化一个类的对象，并返回这个对象的地址，里面的数据都是默认值
2）==有参数构造器==：初始化一个类的对象，并返回这个对象的地址，并且可以同时为对象赋值
```java
public class Car{
 String name;
 double price; //这是成员变量声明


public Car(){    
System.out.println("无参数构造器被调用了~~")
}


public Car(Stringn,doublep){
System.out.println("有参数构造器被调用了~~")
name = n; 
price = p;
    }
}
```
```java
class StudentExtended{
    private long studentID;
    private int classID;
    private String name;
    private String sex;
    private int age;        //这上面是成员变量声明

    public StudentExtended(long studentID, int classID, String name,
                   String sex, int age){
        this.studentID = studentID;
        this.classID = classID;
        this.name = name;
        this.sex = sex;
        this.age = age;    //这里是构造器
    }
}
```
==this和super关键字帮助快速完成构造：==
##### ==this关键字==
代表当前对象的地址，可以访问当前成员变量和成员方法

1）、当成员变量与形参名相同时，可以使用this关键字来区分。
又或者说另一种情况：在一个方法里面，局部变量与成员变量名字相同时，成员变量会被隐藏，这时想用成员变量就要用this关键字
```
class Tom{
int x=10,y;
public void f(){
    int x=20;

    y=x+10;//这里的x是局部变量，y=30
    y=this.x+10;//这里的this.x是成员变量，y=20
        }
    }

```
```java
class StudentExtended{
    private long studentID;
    private int classID;
    private String name;
    private String sex;
    private int age;
    public StudentExtended(long studentID, int classID, String name,
                   String sex, int age){
        this.studentID = studentID;
        this.classID = classID;
        this.name = name;
        this.sex = sex;
        this.age = age;
    }
}
```
2）、当构造方法中，有多个参数时，可以使用this关键字来调用其他构造方法。
```java
class StudentExtended{
public StudentExtended(long studentID, int classID, String name,
                   String sex, int age){
        this.studentID = studentID;
        this.classID = classID;
        this.name = name;
        this.sex = sex;
        this.age = age;
    }

public StudentExtended(long studentID, int classID, String name){
        this(studentID, classID, name, "男", 0);
    }
}
```
##### ==super关键字==
1）、访问父类的成员变量和成员方法
```java
class Father {
    // 父类的成员变量 x
    int x = 10;
}

class Son extends Father {
    // 子类的成员变量 x（和父类同名，会隐藏父类的 x）
    int x = 20;

    public void f() {
        // 子类方法里的局部变量 x
        int x = 30;

        // 直接写 x，优先用局部变量 x=30
        System.out.println("直接写 x：" + x);          // 输出 30

        // this.x 指的是当前子类对象的成员变量 x=20
        System.out.println("this.x：" + this.x);      // 输出 20

        // super.x 指的是父类中定义的成员变量 x=10
        System.out.println("super.x：" + super.x);    // 输出 10
    }
}

public class TestSuper {
    public static void main(String[] args) {
        Son son = new Son();
        son.f();
    }
}
```
2）、super关键字可以调用父类的构造方法，快速完成构造器，可以类比this的2）
```java
class StudentExtended{
public StudentExtended(long studentID, int classID, String name,
                   String sex, int age){
        this.studentID = studentID;
        this.classID = classID;
        this.name = name;
        this.sex = sex;
        this.age = age;
    }
}
class StudentExtended2 extends StudentExtended{
    public StudentExtended2(long studentID, int classID, String name, String sex, int age){
        super(studentID, classID, name, sex, age);
    }
}
```
<span style="color:red">注意：子类不能重复声明父类的成员变量，否则会被隐藏变成null
![](https://cdn.jsdelivr.net/gh/March030303/Picgo@main/img/c7317948d5f5fa84af028369fd3533aa.png)

</span>

### <center>内部类
分为四种：成员内部类、局部内部类、==匿名内部类==、静态内部类

# <center>方法


举个方法的例子：
```Student stu=new Student();```

==前半段：Student stu==是一个引用类型，存的是对象的地址，在栈中（用类声明了一个对象）
==后半段：new Student()== 创建了一个Student对象，是实例，在堆中（创建了一个对象）

再举个例子，表示stu2的地址赋值给stu1，stu1和stu2指向同一个对象：
```
Student stu1=new Student();
Student stu2=new Student();
stu1=stu2
```
### 方法定义
1）主要注意是不是void，来判断要不要传参、传什么参数

2）而方法是可以重载的，也就是方法名相同，参数列表不同

3）方法不能嵌套，==不要在main方法的大括号里面再定义方法==

##### 拓展：==return关键字==
return关键字可以结束方法的执行，可以类比break在循环的作用

而且要特别注意只能用在void方法中：
![](https://cdn.jsdelivr.net/gh/March030303/Picgo@main/img/20260507161959133.png)


### 方法调用
下面这些方法都是在一个类里的
1）类方法中可以直接访问类的成员，不可以直接访问实例成员。
2）实例方法中既可以直接访问类成员（不推荐），也可以直接访问实例成员。
3）实例方法中可以出现this关键字，类方法中不可以出现this关键字的。

总结：
* 对象名.实例方法
* 对象名.类方法（不推荐）
* 类.类方法
* ~~类.实例方法~~
#### 有返回值：赋值调用、输出调用、直接调用
```java
int res = add(1,2);               //这里add方法是在一个类里的

System.out.println(res);        //赋值调用

System.out.println(add(1,2));        //输出调用
```
#### 无返回值：直接调用


### 方法传参
传参是==值传递==，什么值取决于参数类型

参数有两种类型：==基本数据类型、引用数据类型==，前者为值，后者为地址

以引用数据类型为例：
```java
public class MethodDemo2 {
public static void main(string[] args) {
int[] arrs = new int[]{10, 20, 30}; 
change(arrs);
System.out.println ("main: "+ arrs[1]); 

public static void change(int[] arrs){    //参数是引用数据类型
System.out.println("方法内1："+arrs[1]);
arrs[1] = 222;                            //值是会被改变的
System.out.println("方法内2："+arrs[1]);
        }
    }
}
```
# <center>代码块
主要是初始化赋值用的，分为两类：静态代码块、实例代码块

**静态代码块：** ==static {}== 类加载时执行），完成对类的初始化
**实例代码块：** =={}== 使用较少
