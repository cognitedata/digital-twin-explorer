import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Tabs, Pagination, Spin, Input, Table } from 'antd';
import {
  FilesMetadata,
  InternalId,
  FilesSearchFilter,
  IdEither,
} from '@cognite/sdk';
import styled from 'styled-components';
import debounce from 'lodash/debounce';
import moment from 'moment';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from '../../modules/threed';
import {
  selectAssets,
  AssetsState,
  createNewAsset,
  fetchAssets,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';
import { sdk } from '../../index';
import FilePreview from './FilePreview';

const { TabPane } = Tabs;

export type FilesMetadataWithDownload = FilesMetadata & {
  downloadUrl?: string;
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
const FileList = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .results {
    flex: 1;
    overflow: auto;
  }
`;

const StyledTabs = styled(Tabs)`
  && {
    margin-top: 12px;
    flex: 1;
  }
  && .ant-tabs-content {
    height: 100%;
  }
  && .ant-tabs-tabpane-active {
    height: 100%;
  }
`;

const Images = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-wrap: wrap;
  overflow: auto;
  margin: -12px;
  margin-bottom: 12px;

  && > .item {
    margin: 12px;
    padding: 6px;
    background: #fff;
    flex: 1 250px;
    transition: 0.3s all;
  }

  && > .item:hover {
    background: #dfdfdf;
  }

  && > .item img {
    width: 100%;
    height: auto;
  }

  && > .item .image {
    width: 100%;
    height: 200px;
    margin-bottom: 12px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
  }
  && > .item p {
    margin-bottom: 0;
  }
`;

export const FileExplorerTabs: { [key in FileExplorerTabsType]: string } = {
  all: 'All',
  images: 'Images',
  documents: 'Documents',
};

export type FileExplorerTabsType = 'all' | 'images' | 'documents';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  fetchAssets: typeof fetchAssets;
  createNewAsset: typeof createNewAsset;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = {
  tab: FileExplorerTabsType;
  current: number;
  fetching: boolean;
  query: string;
  searchResults: FilesMetadata[];
  imageUrls: FilesMetadataWithDownload[];
  selectedDocument?: FilesMetadataWithDownload;
};

class MapModelToAssetForm extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    query: '',
    tab: 'all',
    fetching: false,
    current: 0,
    searchResults: [],
    imageUrls: [],
  };

  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 100);
  }

  componentDidMount() {
    this.doSearch();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevState.query !== this.state.query ||
      prevState.tab !== this.state.tab
    ) {
      this.doSearch(this.state.query);
    }

    if (prevProps.app.assetId !== this.props.app.assetId) {
      this.doSearch(this.state.query);
    }

    if (
      this.state.tab === 'images' &&
      (prevState.current !== this.state.current ||
        (this.state.searchResults.length > 0 &&
          prevState.searchResults.length !== this.state.searchResults.length))
    ) {
      this.fetchImageUrls();
    }
  }

  doSearch = async (query?: string) => {
    const {
      assets: { all: assets },
      app: { assetId },
    } = this.props;
    const { tab } = this.state;
    const config: FilesSearchFilter = {
      filter: {
        ...(tab !== 'all' && {
          mimeType: tab === 'images' ? 'image/jpeg' : 'application/pdf',
        }),
        ...(assetId && { assetIds: [assetId] }),
      },
      limit: 1000,
    };
    this.setState({ fetching: true, searchResults: [], imageUrls: [] });
    let results: FilesMetadata[] = [];
    if (query && query.length > 0) {
      results = await sdk.files.search({
        search: { name: query },
        ...config,
      });
      if (tab === 'images') {
        results = results.concat(
          await sdk.files.search({
            search: { name: query },
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'image/png',
            },
          })
        );
      }
      if (tab === 'documents') {
        results = results.concat(
          await sdk.files.search({
            search: { name: query },
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'pdf',
            },
          })
        );
        results = results.concat(
          await sdk.files.search({
            search: { name: query },
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'PDF',
            },
          })
        );
      }
      this.setState({
        searchResults: results.slice(0, results.length),
        fetching: false,
      });
    } else {
      this.setState({ fetching: true });
      results = (await sdk.files.list(config)).items;
      if (tab === 'images') {
        results = results.concat(
          (await sdk.files.list({
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'image/png',
            },
          })).items
        );
      }
      if (tab === 'documents') {
        results = results.concat(
          (await sdk.files.list({
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'pdf',
            },
          })).items
        );
        results = results.concat(
          (await sdk.files.list({
            ...config,
            filter: {
              ...config.filter,
              mimeType: 'PDF',
            },
          })).items
        );
      }
      this.setState({
        searchResults: results.slice(0, results.length),
        fetching: false,
        current: 0,
      });
    }
    const extraAssets: Set<number> = results.reduce(
      (prev: Set<number>, el: FilesMetadata) => {
        if (el.assetIds && el.assetIds.length > 0) {
          el.assetIds.filter(id => !assets[id]).forEach(id => prev.add(id));
        }
        return prev;
      },
      new Set<number>()
    );

    this.props.fetchAssets(Array.from(extraAssets));
  };

  fetchImageUrls = async () => {
    const { searchResults, current } = this.state;

    // WIP, thumbnails

    // const promises = searchResults.map(async result => {
    //   try {
    //     return {
    //       ...result,
    //       downloadUrl: await sdk.get(
    //         `https://api.cognitedata.com/api/playground/projects/${sdk.project}/files/icon?id=${result.id}`
    //       ),
    //     };
    //   } catch (e) {
    //     return result;
    //   }
    // });

    // console.log(await Promise.all(promises));

    const ids: IdEither[] = searchResults
      .slice(current * 20, current * 20 + 20)
      .map(el => ({ id: el.id }));
    const urls = await sdk.files.getDownloadUrls(ids);
    this.setState({
      imageUrls: searchResults.map(el => {
        const url = urls.find(
          downloadUrl => (downloadUrl as InternalId).id === el.id
        );
        if (!url) {
          return { ...el, downloadUrl: undefined };
        }
        return { ...el, downloadUrl: url.downloadUrl };
      }) as FilesMetadataWithDownload[],
    });
  };

  renderImages = () => {
    const { current } = this.state;
    return (
      <Images>
        {this.state.imageUrls
          .slice(current * 20, current * 20 + 20)
          .map((image, i) => {
            return (
              <div
                className="item"
                role="button"
                tabIndex={i}
                onKeyDown={() => this.setState({ selectedDocument: image })}
                onClick={() => this.setState({ selectedDocument: image })}
              >
                <div
                  className="image"
                  style={{ backgroundImage: `url(${image.downloadUrl})` }}
                >
                  {!image.downloadUrl && <p>Unable to Load Image</p>}
                </div>
                <p>{image.name}</p>
                <p>
                  Created At: {moment(image.createdTime).format('DD/MM/YYYY')}
                </p>
              </div>
            );
          })}
      </Images>
    );
  };

  renderListResult = () => {
    const { searchResults, current } = this.state;
    const { all: assets } = this.props.assets;
    return (
      <div className="results">
        <Table
          dataSource={searchResults.slice(current * 20, current * 20 + 20)}
          pagination={false}
          onRowClick={item => this.setState({ selectedDocument: item })}
          columns={[
            {
              title: 'Name',
              key: 'name',
              dataIndex: 'name',
              render: (name: string) => (
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'unset',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    maxWidth: '600px',
                  }}
                >
                  {name}
                </span>
              ),
            },
            { title: 'Type', key: 'type', dataIndex: 'mimeType' },
            {
              title: 'Created Time',
              key: 'ctime',
              render: item => (
                <span>{moment(item.createdTime).format('DD/MM/YYYY')}</span>
              ),
            },
            {
              title: 'Linked Assets',
              key: 'asset',
              width: '400px',
              render: (item: FilesMetadata) => (
                <span>
                  {item.assetIds
                    ? item.assetIds
                        .slice(0, 10)
                        .map((el: number) =>
                          assets[el] ? assets[el].name : el
                        )
                        .join(', ') + (item.assetIds.length > 0 ? '...' : '')
                    : 'N/A'}
                </span>
              ),
            },
          ]}
        />
      </div>
    );
  };

  render() {
    const {
      tab,
      searchResults,
      current,
      fetching,
      query,
      selectedDocument,
    } = this.state;
    if (selectedDocument) {
      return (
        <FilePreview
          selectedDocument={selectedDocument}
          unselectDocument={() =>
            this.setState({ selectedDocument: undefined })
          }
        />
      );
    }
    let list = this.renderListResult();
    if (tab === 'images') {
      list = this.renderImages();
    }
    return (
      <Wrapper>
        <Input.Search
          placeholder="Filter"
          onChange={ev => this.setState({ query: ev.target.value })}
          value={query}
        />
        <StyledTabs
          activeKey={tab}
          tabPosition="left"
          onChange={(selectedTab: string) => {
            this.setState({
              tab: selectedTab as FileExplorerTabsType,
              current: 0,
            });
          }}
        >
          {['all', 'images', 'documents'].map((key: string) => (
            <TabPane
              forceRender
              tab={FileExplorerTabs[key as FileExplorerTabsType]}
              key={key as FileExplorerTabsType}
            >
              <FileList>
                {fetching ? <Spin /> : list}
                <Pagination
                  current={current + 1}
                  pageSize={20}
                  onChange={index => this.setState({ current: index - 1 })}
                  total={searchResults.length}
                />
              </FileList>
            </TabPane>
          ))}
        </StyledTabs>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
      fetchAssets,
      setRevisionRepresentAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);