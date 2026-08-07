import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Card from "./Card.vue";

describe("Card", () => {
  it("renders the title and default slot", () => {
    const wrapper = mount(Card, {
      props: { title: "Modules" },
      slots: { default: "<p>content</p>" },
    });
    expect(wrapper.find(".card-title").text()).toBe("Modules");
    expect(wrapper.text()).toContain("content");
  });

  it("omits the title when none is provided", () => {
    const wrapper = mount(Card);
    expect(wrapper.find(".card-title").exists()).toBe(false);
  });
});
