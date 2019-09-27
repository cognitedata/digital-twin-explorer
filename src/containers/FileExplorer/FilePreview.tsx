import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Divider, message, Spin, Table, Icon } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Asset } from '@cognite/sdk';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import { selectAssets, AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState, setAssetId } from '../../modules/app';
import { sdk } from '../../index';
import {
  FilesMetadataWithDownload,
  FileExplorerTabsType,
} from './FileExplorer';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ItemPreview = styled.div`
  display: flex;
  flex: 1;
  margin-top: 12px;
  overflow: hidden;
  .content {
    flex: 2;
    overflow: auto;
  }
  .preview {
    flex: 1 400px;
    margin-right: 12px;
    background-repeat: no-repeat;
    background-size: contain;
  }
  .preview img {
    width: 100%;
  }
`;

type OrigProps = {
  selectedDocument: FilesMetadataWithDownload;
  unselectDocument: () => void;
};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  detectingAsset: boolean;
  assetResults?: Asset[];
};

class MapModelToAssetForm extends React.Component<Props, State> {
  state: Readonly<State> = { detectingAsset: false };

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    if (
      (this.type === 'images' || this.type === 'documents') &&
      !this.state.filePreviewUrl
    ) {
      this.fetchFileUrl();
    }
  }

  get type(): FileExplorerTabsType {
    const { mimeType } = this.props.selectedDocument;
    if (!mimeType) {
      return 'all';
    }
    if (mimeType.toLowerCase().indexOf('pdf') !== -1) {
      return 'documents';
    }
    if (
      mimeType.toLowerCase().indexOf('png') !== -1 ||
      mimeType.toLowerCase().indexOf('jpeg') !== -1
    ) {
      return 'images';
    }
    return 'all';
  }

  fetchFileUrl = async () => {
    const { selectedDocument } = this.props;
    const [url] = await sdk.files.getDownloadUrls([
      { id: selectedDocument.id },
    ]);
    this.setState({
      filePreviewUrl: url.downloadUrl,
    });
  };

  renderDocumentAssetDetection = () => {
    const { assetResults } = this.state;
    const { all } = this.props.assets;
    if (!assetResults) {
      return <Spin tip="Loading...." />;
    }
    return (
      <Wrapper>
        <div>
          <Button onClick={() => this.setState({ detectingAsset: false })}>
            <Icon type="arrow-left" />
            Back To File Information
          </Button>
        </div>
        <Table
          onRowClick={(asset: Asset) =>
            this.props.setAssetId(asset.rootId, asset.id)
          }
          columns={[
            {
              key: 'name',
              title: 'Asset Name',
              dataIndex: 'name',
            },
            {
              key: 'description',
              title: 'Asset Description',
              dataIndex: 'description',
            },
            {
              key: 'rootAsset',
              title: 'Root Asset',
              dataIndex: 'rootId',
              render: rootId => {
                return (
                  <span>
                    {rootId && all[rootId] ? all[rootId].name : rootId}
                  </span>
                );
              },
            },
          ]}
          dataSource={assetResults}
        />
      </Wrapper>
    );
  };

  renderDefaultContentView = () => {
    const { selectedDocument } = this.props;
    const { name, source, mimeType, createdTime, metadata } = selectedDocument;
    return (
      <>
        <p>Name: {name}</p>
        <p>Source: {source}</p>
        <p>Type: {mimeType}</p>
        <p>Created Date: {moment(createdTime).format('DD/MM/YYYY')}</p>
        <pre>{JSON.stringify(metadata, null, 2)}</pre>

        <Divider />
        <Button onClick={() => message.info('Coming soon...')}>
          Link to Asset
        </Button>
        <br />
        <br />
        <Button onClick={() => message.info('Coming soon...')}>
          Add Labels
        </Button>
        <Button onClick={() => message.info('Coming soon...')}>Add Type</Button>
        <Button onClick={() => message.info('Coming soon...')}>
          Add Metadata
        </Button>
        {this.type === 'documents' && (
          <>
            <Divider />
            <Button
              size="large"
              type="primary"
              onClick={() =>
                this.setState({ detectingAsset: true }, () => {
                  const { all } = this.props.assets;
                  const allAssets = Object.values(all);
                  const results: Asset[] = [];
                  const selectedIndex: number[] = [];
                  const total = Math.floor(Math.random() * 12 + 4);
                  for (let i = 0; i < total; i += 1) {
                    let randomIndex = Math.floor(
                      Math.random() * allAssets.length
                    );
                    while (selectedIndex.indexOf(randomIndex) !== -1) {
                      randomIndex = Math.floor(
                        Math.random() * allAssets.length
                      );
                    }
                    results.push(allAssets[randomIndex]);
                  }
                  setTimeout(
                    () => this.setState({ assetResults: results }),
                    5000
                  );
                })
              }
            >
              Detect Assets In Document
            </Button>
          </>
        )}
      </>
    );
  };

  render() {
    const { filePreviewUrl, detectingAsset } = this.state;

    return (
      <Wrapper>
        <div>
          <Button onClick={this.props.unselectDocument}>
            <Icon type="arrow-left" />
            BACK
          </Button>
        </div>
        <ItemPreview>
          {this.type === 'images' && (
            <div
              className="preview"
              style={{ backgroundImage: `url(${filePreviewUrl})` }}
            >
              {!filePreviewUrl && <p>Loading...</p>}
            </div>
          )}
          {this.type === 'documents' && (
            <div className="preview">
              {filePreviewUrl ? (
                <object
                  width="100%"
                  height="100%"
                  data={filePreviewUrl}
                  type="application/pdf"
                >
                  <embed src={filePreviewUrl} type="application/pdf" />
                </object>
              ) : (
                <p>Loading...</p>
              )}
            </div>
          )}
          <div className="content">
            {detectingAsset
              ? this.renderDocumentAssetDetection()
              : this.renderDefaultContentView()}
          </div>
        </ItemPreview>
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
      setAssetId,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
