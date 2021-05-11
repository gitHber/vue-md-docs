<!--
 - 2021-04-12
 - author: 李坤
 - desc: app
-->
<template>
    <div>
        <h1>{{ num }}</h1>
        <button @click="num++">+</button>
        <DemoMd />
    </div>
</template>
<script lang='ts'>
import DemoMd from "./Demo.vue.md";
import Demo from "./Demo.vue";
export default {
    name: "app",
    components: {
        Demo,
        DemoMd,
    },
    props: {
        a: {
            type: String,
        },
    },
    data() {
        return {
            num: 0,
        };
    },
};
</script>
<style scoped>
#app {
    color: red;
}
</style>