## a **aa**

你好

```vue
<template>
    <div>
        <h1 @click="handleClick">click {{ times }}</h1>
        <Demo></Demo>
    </div>
</template>
<script>
import Demo from './Demo.vue';
export default {
    components: { Demo },
    data() {
        return {
            times: 0,
        };
    },
    methods: {
        handleClick() {
            this.times++;
        },
    },
};
</script>
<style scoped>
h1 {
    font-size: 14px;
    border-radius: 4px;
    background: #123;
    color: #fff;
    display: inline-flex;
    padding: 10px;
}
</style>
```
