// @ts-check
import { computed, markRaw, ref } from "vue";
import { defineStore } from "pinia"
import DefaultComponent from "../components/Default.vue"

/**
 * @typedef {{name: string, component: any}} SecondPage
 * @typedef {{name: string, children: Array<SecondPage>}} FirstPage
 */
export const usePageStore = defineStore("page", () => {
    /**
     * @type FirstPage[]
     */
    const _raw_pages = [];
    const pages = ref(_raw_pages);
    const curFirstIdx = ref(-1);
    const curSecondIdx = ref(-1);

    /**
     * @param {string} name
     */
    function _addFirst(name) {
        const page = { name: name, children: [] }
        pages.value.push(page);
    }

    /**
     * @param {string} name
     * @param {any} component
     */
    function _addSecond(name, component) {
        if (pages.value.length <= 0) {
            return;
        }
        const firstPage = pages.value[pages.value.length - 1];
        const page = { name: name, component: markRaw(component) };
        firstPage.children.push(page);
        if (curSecondIdx.value < 0) {
            curFirstIdx.value = pages.value.length - 1;
            curSecondIdx.value = firstPage.children.length - 1;
        }
    }

    _addFirst("一级标题1");
    _addSecond("二级标题1-1", DefaultComponent);
    _addSecond("二级标题1-2", DefaultComponent);
    _addFirst("一级标题2");
    _addSecond("二级标题2-1", DefaultComponent);
    _addSecond("二级标题2-2", DefaultComponent);

    /**
     * @param {number} index
     */
    function _getFirstPage(index) {
        if (index < 0 || index >= pages.value.length) {
            return null;
        }
        return pages.value[index];
    }

    const curFirstName = computed(() => {
        const firstPage = _getFirstPage(curFirstIdx.value);
        return firstPage?.name;
    });

    const curFirstChildren = computed(() => {
        const firstPage = _getFirstPage(curFirstIdx.value);
        return firstPage?.children;
    })

    const curSecondName = computed(() => {
        const firstPage = _getFirstPage(curFirstIdx.value);
        if (firstPage == null) {
            return null;
        }
        const secondPages = firstPage.children;
        if (curSecondIdx.value < 0 || curSecondIdx.value >= secondPages.length) {
            return null;
        }
        return secondPages[curSecondIdx.value].name;
    })

    const curComponent = computed(() => {
        const firstPage = _getFirstPage(curFirstIdx.value);
        if (firstPage == null) {
            return DefaultComponent;
        }
        const secondPages = firstPage.children;
        if (curSecondIdx.value < 0 || curSecondIdx.value >= secondPages.length) {
            return DefaultComponent;
        }
        return secondPages[curSecondIdx.value].component || DefaultComponent;
    });

    /**
     * @param {number} index
     */
    function setFirstIndex(index) {
        curFirstIdx.value = index
        curSecondIdx.value = 0
    }

    /**
     * @param {number} index
     */
    function setSecondIndex(index) {
        curSecondIdx.value = index
    }

    return {
        pages,
        curFirstIdx,
        curSecondIdx,
        curFirstName,
        curFirstChildren,
        curSecondName,
        curComponent,
        setFirstIndex,
        setSecondIndex
    }
})