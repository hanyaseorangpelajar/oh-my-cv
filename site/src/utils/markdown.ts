import MarkdownIt from "markdown-it";
import type {
  PluginSimple,
  PluginWithOptions,
  Options as MarkdownItOptions
} from "markdown-it";
// @ts-expect-error missing types
import MarkdownItDeflist from "markdown-it-deflist";
import LinkAttributes from "markdown-it-link-attributes";
import MarkdownItKatex from "@ohmycv/markdown-it-katex";
import MarkdownItCite from "@ohmycv/markdown-it-cross-ref";
import MarkdownItLatexCmds from "@ohmycv/markdown-it-latex-cmds";
import { FrontMatterParser } from "@ohmycv/front-matter";

type ResumeHeaderItem = {
  readonly text: string;
  readonly link?: string;
  readonly newLine?: boolean;
};

export type ResumeFrontMatter = {
  readonly name?: string;
  readonly avatar?: string;
  readonly avatarShape?: "circle" | "rounded" | "square";
  readonly avatarWidth?: string;
  readonly avatarHeight?: string;
  readonly avatarPosition?: "left" | "right";
  readonly header?: Array<ResumeHeaderItem>;
};

type MarkdownItPlugins = Array<
  PluginSimple | PluginWithOptions | [PluginWithOptions, any]
>;

type MarkdownServiceOptions = {
  readonly plugins?: MarkdownItPlugins;
  readonly options?: MarkdownItOptions;
};

export class MarkdownService {
  private _md: MarkdownIt;
  private _frontMatterParser: FrontMatterParser<ResumeFrontMatter>;

  constructor(opt: MarkdownServiceOptions = {}) {
    this._md = this._setupMarkdownIt(opt);
    this._frontMatterParser = new FrontMatterParser<ResumeFrontMatter>({
      errorBehavior: "last"
    });
  }

  private _setupMarkdownIt({ plugins = [], options = {} }: MarkdownServiceOptions) {
    const md = new MarkdownIt(options);

    plugins.forEach((plugin) => {
      if (Array.isArray(plugin)) md.use(...plugin);
      else md.use(plugin);
    });

    return md;
  }

  private _renderMarkdown(md: string) {
    return this._md.render(md);
  }

  /**
   * Convert
   *
   *  <dt>...</dt>
   *  <dd>...</dd>
   *  <dt>...</dt>
   *  <dd>...</dd>
   *
   * (this would happen if two deflists are adjacent)
   *
   * to
   *
   * <dl>
   *   <dt>...</dt>
   *   <dd>...</dd>
   * </dl>
   * <dl>
   *   <dt>...</dt>
   *   <dd>...</dd>
   * </dl>
   *
   * @param html HTML string
   * @returns HTML string with resolved deflists
   */
  private _resolveDeflist(html: string) {
    return html.replace(/<dl>([\s\S]*?)<\/dl>/g, (match) =>
      match.replace(/<\/dd>\n<dt>/g, "</dd>\n</dl>\n<dl>\n<dt>")
    );
  }

  private _renderHeaderItem(item: ResumeHeaderItem, space: boolean) {
    let element = item.link
      ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.text}</a>`
      : item.text;

    element = `<span class="resume-header-item ${space ? "" : "no-separator"}">
      ${element}
    </span>`;

    if (space) {
      element += " &nbsp; ";
    }

    return item.newLine ? `<br>\n${element}` : element;
  }

  public renderHeader(frontMatter: ResumeFrontMatter) {
    const nameHtml = frontMatter.name ? `<h1>${frontMatter.name}</h1>\n` : "";
    const headerItemsHtml = (frontMatter.header ?? [])
      .map((item, i, array) =>
        this._renderHeaderItem(item, i !== array.length - 1 && !array[i + 1].newLine)
      )
      .join("\n");

    const textContent = `${nameHtml}${headerItemsHtml}`;

    if (frontMatter.avatar) {
      const shape = frontMatter.avatarShape || "square";
      const width = frontMatter.avatarWidth || "3cm";
      const height = frontMatter.avatarHeight || "4cm";
      const position = frontMatter.avatarPosition || "left";
      const avatarHtml = `<div class="resume-avatar-wrapper"><img src="${frontMatter.avatar}" class="resume-avatar shape-${shape}" style="width: ${width}; height: ${height}; object-fit: cover;" /></div>`;

      if (position === "right") {
        return `<div class="resume-header resume-header-with-avatar pos-right"><div class="resume-header-content">${textContent}</div>${avatarHtml}</div>`;
      } else {
        return `<div class="resume-header resume-header-with-avatar pos-left">${avatarHtml}<div class="resume-header-content">${textContent}</div></div>`;
      }
    }

    return `<div class="resume-header">${textContent}</div>`;
  }

  public renderResume(md: string) {
    const { body, frontMatter } = this._frontMatterParser.parse(md);

    const content = this._resolveDeflist(this._renderMarkdown(body));
    const header = this.renderHeader(frontMatter);

    return header + content;
  }
}

export const markdownService = new MarkdownService({
  plugins: [
    MarkdownItDeflist,
    MarkdownItKatex,
    MarkdownItCite,
    MarkdownItLatexCmds,
    [
      LinkAttributes,
      {
        matcher: (link: string) => /^https?:\/\//.test(link),
        attrs: {
          target: "_blank",
          rel: "noopener"
        }
      }
    ]
  ],
  options: {
    html: true
  }
});
