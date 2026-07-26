import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
};

// 友链配置
export const friendsConfig: FriendLink[] = [
	{
		title: "夏夜流萤",
		imgurl:
			"https://weavatar.com/avatar/d252655d40d6874417a720bad0a6c5f77f8f6a1fd2f882f8f338402dc37e4190?s=640",
		desc: "飞萤之火自无梦的长夜亮起，绽放在终竟的明天。",
		siteurl: "https://blog.cuteleaf.cn",
		tags: ["Blog"],
		weight: 10, // 权重，数字越大排序越靠前
		enabled: true, // 是否启用
	},
	{
		title: "Firefly Docs",
		imgurl: "https://docs-firefly.cuteleaf.cn/logo.png",
		desc: "Firefly主题模板文档",
		siteurl: "https://docs-firefly.cuteleaf.cn",
		tags: ["Docs"],
		weight: 1,
		enabled: true,
	},
	{
		title: "Astro",
		imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
		desc: "The web framework for content-driven websites. ⭐️ Star to support our work!",
		siteurl: "https://github.com/withastro/astro",
		tags: ["Framework"],
		weight: 1,
		enabled: true,
	},
	{
    title: "番茄主理人",
    imgurl: "https://q1.qlogo.cn/g?b=qq&nk=20447289&s=640",
    desc: "坐而言不如起而行.",
    siteurl: "https://fqzlr.com/",
    tags: ["Blog"],
    weight: 11,
    enabled: true,
},{
    title: "March",
    imgurl: "https://cdn.jsdelivr.net/gh/March030303/Picgo@main/img/3.jpg",
    desc: "本人的博客",
    siteurl: "https://blog.march03.com",
    tags: ["Blog"],
	weight: 12,
	enabled: true,
},

{
    title: "Zhongye",
    imgurl: "https://avatars.githubusercontent.com/u/145737758?s=400&u=a77ba5dbc8f7c9fd54fe608100908cc6fddaee74&v=4",
    desc: "登高峰乃见云平",
    siteurl: "https://zhongye1.github.io",
    tags: ["Blog"],
    weight: 11,
    enabled: true,
},{
    title: "云深不知屋",
    imgurl: "https://blog.figgeer.com/_astro/touxiang.Dj5T0jsV_foa4s.webp",
    desc: "a beat and a book",
    siteurl: "https://blog.figgeer.com/",
    tags: ["Blog"],
	weight: 10,
	enabled: true,
},
];


// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
